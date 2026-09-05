import { Booking, BookingVendor } from '../types';
import { supabase } from '../lib/supabase';

async function getBusinessId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('You must be signed in.');
  const { data, error } = await supabase.from('business_members').select('business_id').eq('user_id', authData.user.id).limit(1).maybeSingle();
  if (error || !data?.business_id) throw new Error('No business is associated with this account.');
  return data.business_id;
}

function mapBookingVendor(row: any): BookingVendor {
  return { id: row.id, vendorId: row.vendor_id, vendorName: row.vendor_name || '', category: row.category || 'Other', agreedAmount: Number(row.agreed_amount || 0), paymentStatus: row.payment_status || 'Pending', paidAmount: Number(row.paid_amount || 0), paymentDate: row.payment_date || undefined, paymentMethod: row.payment_method || undefined, paymentNotes: row.payment_notes || undefined, notes: row.notes || '' };
}

function mapBooking(row: any, vendorRows: any[] = [], clientName = ''): Booking {
  return { id: row.id, clientId: row.client_id, clientName: clientName || row.client_name || '', eventType: row.event_type, eventDate: row.event_date, eventTime: row.event_time || '', venue: row.venue || '', guestCount: Number(row.guest_count || 0), package: row.package || '', totalAmount: Number(row.total_amount || 0), advancePaid: Number(row.advance_paid || 0), remainingAmount: Number(row.remaining_amount || 0), bookingStatus: row.booking_status, paymentStatus: row.payment_status, notes: row.notes || '', assignedVendors: vendorRows.map(mapBookingVendor), createdAt: row.created_at };
}

async function getVendorRows(bookingIds: string[]): Promise<any[]> {
  if (!bookingIds.length) return [];
  const { data, error } = await supabase.from('booking_vendors').select('*').in('booking_id', bookingIds);
  if (error) throw new Error(`Could not load vendor assignments: ${error.message}`);
  const rows = data || [];
  const vendorIds = [...new Set(rows.map((row: any) => row.vendor_id).filter(Boolean))];
  if (!vendorIds.length) return rows;
  const { data: vendors, error: vendorError } = await supabase.from('vendors').select('id,vendor_name,category').in('id', vendorIds);
  if (vendorError) throw new Error(`Could not load vendor details: ${vendorError.message}`);
  const vendorMap = Object.fromEntries((vendors || []).map((v: any) => [v.id, v]));
  return rows.map((row: any) => ({ ...row, vendor_name: row.vendor_name || vendorMap[row.vendor_id]?.vendor_name || '', category: row.category || vendorMap[row.vendor_id]?.category || 'Other' }));
}

async function getClientNames(clientIds: string[]): Promise<Record<string, string>> {
  const ids = [...new Set(clientIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase.from('clients').select('id,full_name').in('id', ids);
  if (error) throw new Error(`Could not load client names: ${error.message}`);
  return Object.fromEntries((data || []).map((c: any) => [c.id, c.full_name]));
}

async function loadBookingsForBusiness(businessId: string): Promise<any[]> {
  const primary = await supabase.from('bookings').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
  if (primary.error) throw primary.error;
  return primary.data || [];
}

function normalizeDate(value: unknown): string {
  const raw = String(value || '').trim();
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return '';
}

function readLegacyPayments(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('together-events-vendor-payments-v1');
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function repairInvoiceBookingsAndVendorPayments(businessId: string): Promise<void> {
  // Existing invoices created before booking sync was made durable can have booking_id = NULL.
  const { data: invoices, error } = await supabase.from('invoices').select('*').eq('business_id', businessId);
  if (error) throw error;
  if (!invoices?.length) return;

  let bookings = await loadBookingsForBusiness(businessId);
  const legacyPayments = readLegacyPayments();

  for (const invoice of invoices) {
    const eventDate = normalizeDate(invoice.event_date);
    if (!invoice.client_id || !invoice.event_type || !eventDate) continue;

    let booking = invoice.booking_id ? bookings.find((b: any) => b.id === invoice.booking_id) : undefined;
    if (!booking) {
      booking = bookings.find((b: any) =>
        b.client_id === invoice.client_id &&
        normalizeDate(b.event_date) === eventDate &&
        b.event_type === invoice.event_type &&
        Math.abs(Number(b.total_amount || 0) - Number(invoice.total_amount || 0)) < 0.01
      );
    }

    if (!booking) {
      const totalAmount = Number(invoice.total_amount || 0);
      const advancePaid = Number(invoice.advance_paid || 0);
      const { data: created, error: createError } = await supabase.from('bookings').insert({
        business_id: businessId,
        client_id: invoice.client_id,
        event_type: invoice.event_type,
        event_date: eventDate,
        event_time: invoice.event_time || '',
        venue: invoice.venue || '',
        guest_count: Number(invoice.guest_count || 0),
        package: 'Custom Package',
        total_amount: totalAmount,
        advance_paid: advancePaid,
        booking_status: 'Confirmed',
        notes: invoice.notes || '',
      }).select('*').single();
      if (createError) {
        console.warn(`Could not create booking for invoice ${invoice.invoice_number}:`, createError.message);
        continue;
      }
      booking = created;
      bookings = [booking, ...bookings];
    }

    if (invoice.booking_id !== booking.id) {
      const { error: linkError } = await supabase.from('invoices').update({ booking_id: booking.id, event_date: eventDate }).eq('id', invoice.id).eq('business_id', businessId);
      if (linkError) console.warn(`Could not link invoice ${invoice.invoice_number}:`, linkError.message);
    }

    const invoicePayments = legacyPayments.filter((p) => String(p.invoiceId || '') === String(invoice.id) && String(p.vendorId || ''));
    if (!invoicePayments.length) continue;

    const grouped = new Map<string, any>();
    for (const payment of invoicePayments) {
      const vendorId = String(payment.vendorId || '');
      const current = grouped.get(vendorId) || { vendorId, amount: 0, totalAmount: 0, date: '', method: '', notes: '' };
      current.amount += Number(payment.amount || 0);
      current.totalAmount = Math.max(current.totalAmount, Number(payment.totalAmount || 0));
      current.date = current.date || payment.date || '';
      current.method = current.method || payment.method || '';
      current.notes = current.notes || payment.notes || '';
      grouped.set(vendorId, current);
    }

    for (const payment of grouped.values()) {
      const { data: existingRows, error: existingError } = await supabase.from('booking_vendors').select('*').eq('booking_id', booking.id).eq('business_id', businessId).eq('vendor_id', payment.vendorId);
      if (existingError) {
        console.warn('Could not read booking vendor assignment:', existingError.message);
        continue;
      }
      const existing = existingRows?.[0];
      const agreedAmount = Math.max(Number(existing?.agreed_amount || 0), Number(payment.totalAmount || 0));
      const paidAmount = Math.min(Math.max(agreedAmount, Number(payment.amount || 0)), Number(payment.amount || 0));
      const status = agreedAmount > 0 && paidAmount >= agreedAmount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending';
      const payload = {
        business_id: businessId,
        booking_id: booking.id,
        vendor_id: payment.vendorId,
        agreed_amount: agreedAmount,
        payment_status: status,
        paid_amount: paidAmount,
        payment_date: payment.date || null,
        payment_method: payment.method || null,
        payment_notes: payment.notes || null,
        notes: existing?.notes || '',
      };
      if (existing) {
        const { error: updateError } = await supabase.from('booking_vendors').update(payload).eq('id', existing.id).eq('business_id', businessId);
        if (updateError) console.warn('Could not sync legacy vendor payment:', updateError.message);
      } else {
        const { error: insertError } = await supabase.from('booking_vendors').insert(payload);
        if (insertError) console.warn('Could not insert legacy vendor payment:', insertError.message);
      }
    }
  }
}

const vendorDbPayload = (vendor: BookingVendor) => ({ vendor_id: vendor.vendorId, agreed_amount: Number(vendor.agreedAmount || 0), payment_status: vendor.paymentStatus || 'Pending', paid_amount: Number(vendor.paidAmount || 0), payment_date: vendor.paymentDate || null, payment_method: vendor.paymentMethod || null, payment_notes: vendor.paymentNotes || null, notes: vendor.notes || '' });

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    const businessId = await getBusinessId();
    try { await repairInvoiceBookingsAndVendorPayments(businessId); } catch (error) { console.warn('Booking repair skipped:', error); }
    const rows = await loadBookingsForBusiness(businessId);
    const [vendorRows, clientNames] = await Promise.all([getVendorRows(rows.map((row) => row.id)), getClientNames(rows.map((row) => row.client_id))]);
    return rows.map((row) => mapBooking(row, vendorRows.filter((v) => v.booking_id === row.id), clientNames[row.client_id] || ''));
  },
  async getBookingById(id: string): Promise<Booking | null> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).eq('business_id', businessId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [vendorRows, clientNames] = await Promise.all([getVendorRows([id]), getClientNames([data.client_id])]);
    return mapBooking(data, vendorRows, clientNames[data.client_id] || '');
  },
  async createBooking(payload: Omit<Booking, 'id' | 'createdAt' | 'remainingAmount'>): Promise<Booking> {
    const businessId = await getBusinessId();
    const totalAmount = Number(payload.totalAmount || 0);
    const advancePaid = Number(payload.advancePaid || 0);
    const { assignedVendors = [], ...bookingPayload } = payload;
    const { data, error } = await supabase.from('bookings').insert({ business_id: businessId, client_id: bookingPayload.clientId, event_type: bookingPayload.eventType, event_date: bookingPayload.eventDate, event_time: bookingPayload.eventTime || '', venue: bookingPayload.venue || '', guest_count: Number(bookingPayload.guestCount || 0), package: bookingPayload.package || '', total_amount: totalAmount, advance_paid: advancePaid, booking_status: bookingPayload.bookingStatus, notes: bookingPayload.notes || '' }).select('*').single();
    if (error) throw error;
    if (assignedVendors.length) {
      const { error: vendorError } = await supabase.from('booking_vendors').insert(assignedVendors.map((vendor) => ({ business_id: businessId, booking_id: data.id, ...vendorDbPayload(vendor) })));
      if (vendorError) { await supabase.from('bookings').delete().eq('id', data.id).eq('business_id', businessId); throw vendorError; }
    }
    return this.getBookingById(data.id) as Promise<Booking>;
  },
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const businessId = await getBusinessId();
    const current = await this.getBookingById(id);
    if (!current) throw new Error('Booking not found');
    const totalAmount = updates.totalAmount !== undefined ? Number(updates.totalAmount || 0) : current.totalAmount;
    const advancePaid = updates.advancePaid !== undefined ? Number(updates.advancePaid || 0) : current.advancePaid;
    const { assignedVendors, id: _id, createdAt: _createdAt, remainingAmount: _remaining, clientName: _clientName, paymentStatus: _paymentStatus, ...updatesWithoutLocalFields } = updates;
    const dbUpdates: Record<string, any> = {};
    if (updatesWithoutLocalFields.clientId !== undefined) dbUpdates.client_id = updatesWithoutLocalFields.clientId;
    if (updatesWithoutLocalFields.eventType !== undefined) dbUpdates.event_type = updatesWithoutLocalFields.eventType;
    if (updatesWithoutLocalFields.eventDate !== undefined) dbUpdates.event_date = updatesWithoutLocalFields.eventDate;
    if (updatesWithoutLocalFields.eventTime !== undefined) dbUpdates.event_time = updatesWithoutLocalFields.eventTime || '';
    if (updatesWithoutLocalFields.venue !== undefined) dbUpdates.venue = updatesWithoutLocalFields.venue || '';
    if (updatesWithoutLocalFields.guestCount !== undefined) dbUpdates.guest_count = updatesWithoutLocalFields.guestCount;
    if (updatesWithoutLocalFields.package !== undefined) dbUpdates.package = updatesWithoutLocalFields.package || '';
    if (updatesWithoutLocalFields.bookingStatus !== undefined) dbUpdates.booking_status = updatesWithoutLocalFields.bookingStatus;
    if (updatesWithoutLocalFields.notes !== undefined) dbUpdates.notes = updatesWithoutLocalFields.notes || '';
    dbUpdates.total_amount = totalAmount;
    dbUpdates.advance_paid = advancePaid;
    const { data, error } = await supabase.from('bookings').update(dbUpdates).eq('id', id).eq('business_id', businessId).select('*').single();
    if (error) throw error;
    if (assignedVendors !== undefined) {
      const { error: deleteError } = await supabase.from('booking_vendors').delete().eq('booking_id', id).eq('business_id', businessId);
      if (deleteError) throw deleteError;
      if (assignedVendors.length) {
        const { error: insertError } = await supabase.from('booking_vendors').insert(assignedVendors.map((vendor) => ({ business_id: businessId, booking_id: id, ...vendorDbPayload(vendor) })));
        if (insertError) throw insertError;
      }
    }
    return this.getBookingById(data.id) as Promise<Booking>;
  },
  async deleteBooking(id: string): Promise<boolean> {
    const businessId = await getBusinessId();
    const { error: vendorError } = await supabase.from('booking_vendors').delete().eq('booking_id', id).eq('business_id', businessId);
    if (vendorError) throw vendorError;
    const { error } = await supabase.from('bookings').delete().eq('id', id).eq('business_id', businessId);
    if (error) throw error;
    return true;
  },
  async assignVendorToBooking(bookingId: string, vendorData: Omit<BookingVendor, 'id'>): Promise<Booking> {
    const businessId = await getBusinessId();
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const { data, error } = await supabase.from('booking_vendors').insert({ business_id: businessId, booking_id: bookingId, ...vendorDbPayload(vendorData) }).select('*').single();
    if (error) throw error;
    if (!data) throw new Error('Vendor assignment failed');
    return this.getBookingById(bookingId) as Promise<Booking>;
  },
  async assignVendor(bookingId: string, vendorData: Omit<BookingVendor, 'id'>): Promise<Booking> { return this.assignVendorToBooking(bookingId, vendorData); },
  async removeVendorFromBooking(bookingId: string, bookingVendorId: string): Promise<Booking> {
    const businessId = await getBusinessId();
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const { error } = await supabase.from('booking_vendors').delete().eq('id', bookingVendorId).eq('booking_id', bookingId).eq('business_id', businessId);
    if (error) throw error;
    return this.getBookingById(bookingId) as Promise<Booking>;
  },
  async removeAssignedVendor(bookingId: string, bookingVendorId: string): Promise<Booking> { return this.removeVendorFromBooking(bookingId, bookingVendorId); },
};
