import { Invoice, InvoiceItem } from '../types';
import { supabase } from '../lib/supabase';
import { businessService } from './businessService';
import { bookingService } from './bookingService';
import { clientService } from './clientService';

async function getBusinessId(): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('You must be signed in.');

  const { data, error } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', authData.user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.business_id) throw new Error('No business membership found.');
  return data.business_id;
}

function mapItem(row: any): InvoiceItem {
  return {
    id: row.id,
    description: row.description || '',
    quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unit_price || 0),
    total: Number(row.total || 0),
  };
}

function mapInvoice(row: any, items: InvoiceItem[] = []): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    documentTitle: row.document_title || undefined,
    bookingId: row.booking_id || undefined,
    clientId: row.client_id,
    clientName: row.client_name || '',
    clientPhone: row.client_phone || '',
    clientWhatsApp: row.client_whatsapp || '',
    clientEmail: row.client_email || '',
    billingAddress: row.billing_address || '',
    eventType: row.event_type,
    eventDate: row.event_date,
    eventTime: row.event_time || undefined,
    venue: row.venue || '',
    issueDate: row.issue_date,
    dueDate: row.due_date || undefined,
    items,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    tax: Number(row.tax || 0),
    totalAmount: Number(row.total_amount || 0),
    advancePaid: Number(row.advance_paid || 0),
    remainingBalance: Number(row.remaining_balance || 0),
    paymentStatus: row.payment_status === 'Paid' ? 'Paid' : 'Pending',
    notes: row.notes || '',
    termsAndConditions: row.terms_and_conditions || '',
    templateId: row.template_id || 'modern',
    createdAt: row.created_at,
  };
}

async function loadItems(invoiceIds: string[]): Promise<Map<string, InvoiceItem[]>> {
  const map = new Map<string, InvoiceItem[]>();
  if (!invoiceIds.length) return map;

  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .in('invoice_id', invoiceIds);

  if (error) throw error;
  for (const row of data || []) {
    const list = map.get(row.invoice_id) || [];
    list.push(mapItem(row));
    map.set(row.invoice_id, list);
  }
  return map;
}

async function replaceItems(invoiceId: string, items: InvoiceItem[]) {
  const { error: deleteError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId);
  if (deleteError) throw deleteError;

  if (!items.length) return;
  const { error } = await supabase.from('invoice_items').insert(
    items.map((item) => ({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.total ?? item.quantity * item.unitPrice,
    }))
  );
  if (error) throw error;
}

export const invoiceService = {
  async getInvoices(): Promise<Invoice[]> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const itemMap = await loadItems(rows.map((row) => row.id));
    return rows.map((row) => mapInvoice(row, itemMap.get(row.id) || []));
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const businessId = await getBusinessId();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const itemMap = await loadItems([id]);
    return mapInvoice(data, itemMap.get(id) || []);
  },

  async generateNextInvoiceNumber(): Promise<string> {
    const profile = await businessService.getProfile();
    const businessId = await getBusinessId();
    const prefix = profile.invoicePrefix || 'TE-';
    const startingNumber = profile.invoiceStartingNumber || 1001;

    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('business_id', businessId);
    if (error) throw error;

    let maxNum = startingNumber - 1;
    for (const row of data || []) {
      const value = String(row.invoice_number || '');
      if (value.startsWith(prefix)) {
        const num = parseInt(value.slice(prefix.length), 10);
        if (!Number.isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${prefix}${maxNum + 1}`;
  },

  async createInvoice(payload: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const businessId = await getBusinessId();
    const subtotal = payload.items.reduce(
      (sum, item) => sum + (item.total || item.quantity * item.unitPrice),
      0
    );
    const discount = Number(payload.discount || 0);
    const tax = Number(payload.tax || 0);
    const totalAmount = Math.max(0, subtotal - discount + tax);
    const advancePaid = Number(payload.advancePaid || 0);
    const remainingBalance = Math.max(0, totalAmount - advancePaid);
    const paymentStatus = advancePaid >= totalAmount && totalAmount > 0 ? 'Paid' : 'Pending';

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        business_id: businessId,
        invoice_number: payload.invoiceNumber,
        document_title: payload.documentTitle || 'BOOKING CONFIRMATION',
        booking_id: payload.bookingId || null,
        client_id: payload.clientId,
        client_name: payload.clientName,
        client_phone: payload.clientPhone,
        client_whatsapp: payload.clientWhatsApp,
        client_email: payload.clientEmail,
        billing_address: payload.billingAddress,
        event_type: payload.eventType,
        event_date: payload.eventDate,
        event_time: payload.eventTime || null,
        venue: payload.venue,
        issue_date: payload.issueDate,
        due_date: payload.dueDate || null,
        subtotal,
        discount,
        tax,
        advance_paid: advancePaid,
        remaining_balance: remainingBalance,
        payment_status: paymentStatus,
        notes: payload.notes || '',
        terms_and_conditions: payload.termsAndConditions || '',
        template_id: payload.templateId || 'modern',
      })
      .select('*')
      .single();
    if (error) throw error;

    await replaceItems(data.id, payload.items);
    return mapInvoice(data, payload.items);
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const current = await this.getInvoiceById(id);
    if (!current) throw new Error('Invoice not found');

    const items = updates.items || current.items;
    const subtotal = items.reduce(
      (sum, item) => sum + (item.total || item.quantity * item.unitPrice),
      0
    );
    const discount = updates.discount !== undefined ? Number(updates.discount) : current.discount;
    const tax = updates.tax !== undefined ? Number(updates.tax) : current.tax;
    const totalAmount = Math.max(0, subtotal - discount + tax);
    const advancePaid = updates.advancePaid !== undefined ? Number(updates.advancePaid) : current.advancePaid;
    const remainingBalance = Math.max(0, totalAmount - advancePaid);
    const paymentStatus = advancePaid >= totalAmount && totalAmount > 0 ? 'Paid' : 'Pending';
    const businessId = await getBusinessId();

    const dbUpdates: Record<string, any> = {
      ...(updates.invoiceNumber !== undefined && { invoice_number: updates.invoiceNumber }),
      ...(updates.documentTitle !== undefined && { document_title: updates.documentTitle }),
      ...(updates.bookingId !== undefined && { booking_id: updates.bookingId || null }),
      ...(updates.clientId !== undefined && { client_id: updates.clientId }),
      ...(updates.clientName !== undefined && { client_name: updates.clientName }),
      ...(updates.clientPhone !== undefined && { client_phone: updates.clientPhone }),
      ...(updates.clientWhatsApp !== undefined && { client_whatsapp: updates.clientWhatsApp }),
      ...(updates.clientEmail !== undefined && { client_email: updates.clientEmail }),
      ...(updates.billingAddress !== undefined && { billing_address: updates.billingAddress }),
      ...(updates.eventType !== undefined && { event_type: updates.eventType }),
      ...(updates.eventDate !== undefined && { event_date: updates.eventDate }),
      ...(updates.eventTime !== undefined && { event_time: updates.eventTime || null }),
      ...(updates.venue !== undefined && { venue: updates.venue }),
      ...(updates.issueDate !== undefined && { issue_date: updates.issueDate }),
      ...(updates.dueDate !== undefined && { due_date: updates.dueDate || null }),
      ...(updates.notes !== undefined && { notes: updates.notes || '' }),
      ...(updates.termsAndConditions !== undefined && { terms_and_conditions: updates.termsAndConditions || '' }),
      ...(updates.templateId !== undefined && { template_id: updates.templateId }),
      subtotal,
      discount,
      tax,
      advance_paid: advancePaid,
      remaining_balance: remainingBalance,
      payment_status: paymentStatus,
    };

    const { data, error } = await supabase
      .from('invoices')
      .update(dbUpdates)
      .eq('id', id)
      .eq('business_id', businessId)
      .select('*')
      .single();
    if (error) throw error;

    if (updates.items !== undefined) await replaceItems(id, items);
    return mapInvoice(data, items);
  },

  async deleteInvoice(id: string): Promise<boolean> {
    const businessId = await getBusinessId();
    await supabase.from('invoice_items').delete().eq('invoice_id', id);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);
    if (error) throw error;
    return true;
  },

  async duplicateInvoice(id: string): Promise<Invoice> {
    const original = await this.getInvoiceById(id);
    if (!original) throw new Error('Original invoice not found');
    const nextInvoiceNumber = await this.generateNextInvoiceNumber();
    const todayStr = new Date().toISOString().split('T')[0];
    const { id: _id, createdAt: _createdAt, ...payload } = original;
    return this.createInvoice({
      ...payload,
      invoiceNumber: nextInvoiceNumber,
      issueDate: todayStr,
    });
  },

  async createInvoiceFromBooking(bookingId: string): Promise<Invoice> {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const client = await clientService.getClientById(booking.clientId);
    const profile = await businessService.getProfile();
    const settings = await businessService.getInvoiceSettings();
    const nextInvoiceNumber = await this.generateNextInvoiceNumber();
    const items: InvoiceItem[] = [{
      id: 'item-' + Date.now(),
      description: `${booking.eventType} Event Management & Venue Setup (${booking.package || 'Custom Package'})`,
      quantity: 1,
      unitPrice: booking.totalAmount,
      total: booking.totalAmount,
    }];
    const todayStr = new Date().toISOString().split('T')[0];

    return this.createInvoice({
      invoiceNumber: nextInvoiceNumber,
      documentTitle: settings.documentTitle || 'BOOKING CONFIRMATION',
      bookingId: booking.id,
      clientId: booking.clientId,
      clientName: client?.fullName || booking.clientName,
      clientPhone: client?.phone || '',
      clientWhatsApp: client?.whatsApp || '',
      clientEmail: client?.email || '',
      billingAddress: client?.billingAddress || '',
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      eventTime: booking.eventTime,
      venue: booking.venue,
      issueDate: todayStr,
      dueDate: booking.eventDate,
      items,
      subtotal: booking.totalAmount,
      discount: 0,
      tax: 0,
      totalAmount: booking.totalAmount,
      advancePaid: booking.advancePaid,
      remainingBalance: booking.remainingAmount,
      paymentStatus: booking.advancePaid >= booking.totalAmount && booking.totalAmount > 0 ? 'Paid' : 'Pending',
      termsAndConditions: profile.defaultTerms,
      notes: booking.notes || '',
      templateId: settings.defaultTemplate || 'modern',
    });
  },
};