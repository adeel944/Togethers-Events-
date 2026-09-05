import { Invoice, Booking, BookingVendor, PaymentStatus, VendorCategory } from '../types';
import { bookingService } from './bookingService';
import { invoiceService } from './invoiceService';

function normalizeEventDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`;
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${String(Number(dmy[2])).padStart(2, '0')}-${String(Number(dmy[1])).padStart(2, '0')}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return '';
}

function buildBookingPayload(invoice: Invoice) {
  return {
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    eventType: invoice.eventType,
    eventDate: normalizeEventDate(invoice.eventDate),
    eventTime: invoice.eventTime || '',
    venue: invoice.venue || '',
    guestCount: Math.max(0, Number(invoice.guestCount || 0)),
    package: invoice.items?.[0]?.description?.trim() || 'Custom Package',
    totalAmount: Number(invoice.totalAmount || 0),
    advancePaid: Number(invoice.advancePaid || 0),
    bookingStatus: 'Confirmed' as const,
    paymentStatus: Number(invoice.advancePaid || 0) >= Number(invoice.totalAmount || 0) && Number(invoice.totalAmount || 0) > 0 ? 'Paid' as const : Number(invoice.advancePaid || 0) > 0 ? 'Partial' as const : 'Pending' as const,
    notes: invoice.notes || '',
    assignedVendors: [],
  };
}

function loadLegacyVendorPayments(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('together-events-vendor-payments-v1');
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function paymentStatus(paid: number, agreed: number): PaymentStatus {
  if (agreed > 0 && paid >= agreed) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Pending';
}

async function migrateLegacyVendorPaymentsToBooking(booking: Booking, invoiceId?: string): Promise<Booking> {
  const payments = loadLegacyVendorPayments().filter((p) => String(p.invoiceId || '') === String(invoiceId || '') && String(p.vendorId || ''));
  if (!payments.length) return booking;

  const grouped = new Map<string, any>();
  for (const payment of payments) {
    const vendorId = String(payment.vendorId || '');
    const current = grouped.get(vendorId) || { vendorId, amount: 0, totalAmount: 0, date: '', method: '', notes: '', eventLabel: '' };
    current.amount += Number(payment.amount || 0);
    current.totalAmount = Math.max(current.totalAmount, Number(payment.totalAmount || 0));
    current.date = current.date || payment.date || '';
    current.method = current.method || payment.method || '';
    current.notes = current.notes || payment.notes || '';
    current.eventLabel = current.eventLabel || payment.eventLabel || '';
    grouped.set(vendorId, current);
  }

  const assignments = [...(booking.assignedVendors || [])];
  let changed = false;
  for (const item of grouped.values()) {
    const existing = assignments.find((v) => v.vendorId === item.vendorId);
    const agreedAmount = Math.max(Number(existing?.agreedAmount || 0), Number(item.totalAmount || 0));
    const paidAmount = Math.min(Math.max(agreedAmount, Number(item.amount || 0)), Number(item.amount || 0));
    const updatedVendor: BookingVendor = existing
      ? {
          ...existing,
          agreedAmount,
          paidAmount,
          paymentStatus: paymentStatus(paidAmount, agreedAmount),
          paymentDate: item.date || existing.paymentDate,
          paymentMethod: item.method || existing.paymentMethod,
          paymentNotes: item.notes || existing.paymentNotes,
        }
      : {
          id: `legacy-bv-${booking.id}-${item.vendorId}`,
          vendorId: item.vendorId,
          vendorName: item.vendorName || '',
          category: (item.category || 'Other') as VendorCategory,
          agreedAmount,
          paidAmount,
          paymentStatus: paymentStatus(paidAmount, agreedAmount),
          paymentDate: item.date || undefined,
          paymentMethod: item.method || undefined,
          paymentNotes: item.notes || undefined,
        };

    if (existing) {
      const index = assignments.findIndex((v) => v.vendorId === item.vendorId);
      if (index >= 0) assignments[index] = updatedVendor;
    } else {
      assignments.push(updatedVendor);
    }
    changed = true;
  }

  if (!changed) return booking;
  return bookingService.updateBooking(booking.id, { assignedVendors: assignments });
}

/** Create the booking linked to an invoice. */
export async function createBookingForInvoice(invoice: Invoice): Promise<Booking | null> {
  const eventDate = normalizeEventDate(invoice.eventDate);
  if (!eventDate || !invoice.eventType || !invoice.clientId) return null;

  let booking: Booking | null = null;
  if (invoice.bookingId) {
    booking = await bookingService.getBookingById(invoice.bookingId);
  }

  if (!booking) {
    const existingBookings = await bookingService.getBookings();
    booking = existingBookings.find((b) =>
      b.clientId === invoice.clientId &&
      normalizeEventDate(b.eventDate) === eventDate &&
      b.eventType === invoice.eventType &&
      Math.abs(Number(b.totalAmount || 0) - Number(invoice.totalAmount || 0)) < 0.01
    ) || null;
  }

  if (!booking) booking = await bookingService.createBooking(buildBookingPayload({ ...invoice, eventDate }));

  if (invoice.bookingId !== booking.id || normalizeEventDate(invoice.eventDate) !== eventDate) {
    await invoiceService.updateInvoice(invoice.id, { bookingId: booking.id, eventDate });
  }

  return migrateLegacyVendorPaymentsToBooking(booking, invoice.id);
}

/** Ensure an invoice always has a durable booking before dependent records such as vendor payments are written. */
export async function ensureBookingForInvoice(invoice: Invoice): Promise<Booking> {
  const booking = await createBookingForInvoice(invoice);
  if (!booking) throw new Error('Unable to create the event booking for this invoice. Check the client, event date and event type.');
  return booking;
}

/** Save the invoice first; booking sync is best-effort so a booking DB issue never destroys a valid invoice. */
export async function createInvoiceWithBooking(invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Promise<{ invoice: Invoice; booking: Booking | null }> {
  const normalizedItems = (invoiceData.items || []).map((item) => ({
    ...item,
    quantity: Math.max(1, Number(item.quantity) || 1),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    total: (Math.max(1, Number(item.quantity) || 1)) * (Math.max(0, Number(item.unitPrice) || 0)),
  }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(0, Number(invoiceData.discount) || 0);
  const tax = Math.max(0, Number(invoiceData.tax) || 0);
  const totalAmount = Math.max(0, subtotal - discount + tax);
  const advancePaid = Math.max(0, Number(invoiceData.advancePaid) || 0);
  const issueDate = invoiceData.issueDate || new Date().toISOString().split('T')[0];
  const eventDate = normalizeEventDate(invoiceData.eventDate);

  const invoice = await invoiceService.createInvoice({
    ...invoiceData,
    eventDate,
    issueDate,
    items: normalizedItems,
    bookingId: undefined,
    subtotal,
    totalAmount,
    remainingBalance: Math.max(0, totalAmount - advancePaid),
  });

  if (!eventDate || !invoice.eventType || !invoice.clientId) return { invoice, booking: null };

  try {
    const booking = await ensureBookingForInvoice({ ...invoice, items: normalizedItems, eventDate, totalAmount, advancePaid });
    const linkedInvoice = await invoiceService.getInvoiceById(invoice.id);
    return { invoice: linkedInvoice || invoice, booking };
  } catch (bookingError) {
    console.error('Invoice saved, but booking/calendar sync failed:', bookingError);
    return { invoice, booking: null };
  }
}

/** Backfill bookings for older invoices that were saved without a booking record, including vendor payments already stored in browser history. */
export async function backfillBookingsFromInvoices(invoices: Invoice[], existingBookings: Booking[]): Promise<Booking[]> {
  const bookings = [...existingBookings];
  for (const invoice of invoices) {
    if (!invoice.clientId || !invoice.eventType) continue;
    const eventDate = normalizeEventDate(invoice.eventDate);
    if (!eventDate) continue;

    let booking = invoice.bookingId ? bookings.find((b) => b.id === invoice.bookingId) : undefined;
    if (!booking) {
      booking = bookings.find((b) =>
        b.clientId === invoice.clientId &&
        normalizeEventDate(b.eventDate) === eventDate &&
        b.eventType === invoice.eventType &&
        Math.abs(Number(b.totalAmount || 0) - Number(invoice.totalAmount || 0)) < 0.01
      );
    }

    try {
      if (!booking) {
        booking = await ensureBookingForInvoice({ ...invoice, eventDate });
        if (booking) bookings.push(booking);
      } else if (invoice.bookingId !== booking.id) {
        await invoiceService.updateInvoice(invoice.id, { bookingId: booking.id, eventDate });
      }

      if (booking) {
        const migrated = await migrateLegacyVendorPaymentsToBooking(booking, invoice.id);
        const index = bookings.findIndex((b) => b.id === migrated.id);
        if (index >= 0) bookings[index] = migrated;
        else bookings.push(migrated);
      }
    } catch (error) {
      console.error(`Could not backfill booking for invoice ${invoice.invoiceNumber}:`, error);
    }
  }
  return bookings;
}
