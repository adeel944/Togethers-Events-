import { Invoice, Booking } from '../types';
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
    paymentStatus: Number(invoice.advancePaid || 0) >= Number(invoice.totalAmount || 0) && Number(invoice.totalAmount || 0) > 0 ? 'Paid' as const : 'Pending' as const,
    notes: invoice.notes || '',
    assignedVendors: [],
  };
}

/** Create the booking linked to an invoice. Throws instead of silently hiding DB/RLS/validation errors. */
export async function createBookingForInvoice(invoice: Invoice): Promise<Booking | null> {
  const eventDate = normalizeEventDate(invoice.eventDate);
  if (!eventDate || !invoice.eventType || !invoice.clientId) return null;
  const booking = await bookingService.createBooking(buildBookingPayload({ ...invoice, eventDate }));
  if (invoice.bookingId !== booking.id) await invoiceService.updateInvoice(invoice.id, { bookingId: booking.id, eventDate });
  return booking;
}

/** Create an invoice and its linked booking as one user-facing flow. */
export async function createInvoiceWithBooking(invoiceData: Omit<Invoice, 'id' | 'createdAt'>): Promise<{ invoice: Invoice; booking: Booking | null }> {
  const normalizedItems = (invoiceData.items || []).map((item) => ({ ...item, quantity: Number(item.quantity) || 0, unitPrice: Number(item.unitPrice) || 0, total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(0, Number(invoiceData.discount) || 0);
  const tax = Math.max(0, Number(invoiceData.tax) || 0);
  const totalAmount = Math.max(0, subtotal - discount + tax);
  const advancePaid = Math.max(0, Number(invoiceData.advancePaid) || 0);
  const packageName = normalizedItems[0]?.description?.trim() || 'Custom Package';
  const issueDate = invoiceData.issueDate || new Date().toISOString().split('T')[0];
  const eventDate = normalizeEventDate(invoiceData.eventDate);

  const invoice = await invoiceService.createInvoice({ ...invoiceData, eventDate, issueDate, items: normalizedItems, bookingId: undefined, subtotal, totalAmount, remainingBalance: Math.max(0, totalAmount - advancePaid) });
  if (!eventDate || !invoice.eventType || !invoice.clientId) return { invoice, booking: null };

  try {
    const booking = await createBookingForInvoice({ ...invoice, items: normalizedItems, eventDate, totalAmount, advancePaid });
    const linkedInvoice = booking ? await invoiceService.getInvoiceById(invoice.id) : invoice;
    return { invoice: linkedInvoice || invoice, booking };
  } catch (bookingError) {
    try { await invoiceService.deleteInvoice(invoice.id); } catch (rollbackError) { console.error('Invoice rollback failed after booking sync error:', rollbackError); }
    const message = bookingError instanceof Error ? bookingError.message : String(bookingError);
    throw new Error(`Invoice could not be synced to the booking calendar: ${message}`);
  }
}

/** Backfill bookings for older invoices that were saved without a booking record. */
export async function backfillBookingsFromInvoices(invoices: Invoice[], existingBookings: Booking[]): Promise<Booking[]> {
  const bookings = [...existingBookings];
  for (const invoice of invoices) {
    if (invoice.bookingId || !invoice.clientId || !invoice.eventType) continue;
    const eventDate = normalizeEventDate(invoice.eventDate);
    if (!eventDate) continue;
    const duplicate = bookings.find((b) => b.clientId === invoice.clientId && normalizeEventDate(b.eventDate) === eventDate && b.eventType === invoice.eventType && Math.abs(Number(b.totalAmount || 0) - Number(invoice.totalAmount || 0)) < 0.01);
    if (duplicate) {
      try { await invoiceService.updateInvoice(invoice.id, { bookingId: duplicate.id, eventDate }); } catch (error) { console.warn('Could not link existing booking to invoice:', error); }
      continue;
    }
    try {
      const booking = await createBookingForInvoice({ ...invoice, eventDate });
      if (booking) bookings.push(booking);
    } catch (error) {
      console.error(`Could not backfill booking for invoice ${invoice.invoiceNumber}:`, error);
    }
  }
  return bookings;
}
