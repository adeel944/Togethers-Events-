import { Invoice, Booking } from '../types';
import { bookingService } from './bookingService';
import { invoiceService } from './invoiceService';

/** Single creation flow: New Invoice always saves first. Booking is created when its required event fields are available. */
export async function createInvoiceWithBooking(
  invoiceData: Omit<Invoice, 'id' | 'createdAt'>
): Promise<{ invoice: Invoice; booking: Booking | null }> {
  const normalizedItems = (invoiceData.items || []).map((item) => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
  }));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(0, Number(invoiceData.discount) || 0);
  const tax = Math.max(0, Number(invoiceData.tax) || 0);
  const totalAmount = Math.max(0, subtotal - discount + tax);
  const advancePaid = Math.max(0, Number(invoiceData.advancePaid) || 0);
  const packageName = normalizedItems[0]?.description?.trim() || 'Custom Package';
  const issueDate = invoiceData.issueDate || new Date().toISOString().split('T')[0];

  // IMPORTANT: invoice is the primary record. Never delete a successfully saved invoice
  // just because the secondary booking creation fails.
  const invoice = await invoiceService.createInvoice({
    ...invoiceData,
    issueDate,
    items: normalizedItems,
    bookingId: undefined,
    subtotal,
    totalAmount,
    remainingBalance: Math.max(0, totalAmount - advancePaid),
  });

  // A booking needs an event date and event type. If either is blank, keep the invoice saved
  // and let the user complete the event details later instead of losing the invoice.
  if (!invoiceData.eventDate || !invoiceData.eventType) {
    return { invoice, booking: null };
  }

  try {
    const booking = await bookingService.createBooking({
      clientId: invoiceData.clientId,
      clientName: invoiceData.clientName,
      eventType: invoiceData.eventType,
      eventDate: invoiceData.eventDate,
      eventTime: invoiceData.eventTime || '',
      venue: invoiceData.venue || '',
      guestCount: Math.max(0, Number((invoiceData as any).guestCount || 0)),
      package: packageName,
      totalAmount,
      advancePaid,
      bookingStatus: 'Confirmed',
      paymentStatus: advancePaid >= totalAmount && totalAmount > 0 ? 'Paid' : 'Pending',
      notes: invoiceData.notes || '',
      assignedVendors: [],
    });
    try {
      const linkedInvoice = await invoiceService.updateInvoice(invoice.id, { bookingId: booking.id });
      return { invoice: linkedInvoice, booking };
    } catch (linkError) {
      console.error('Invoice saved and booking created, but linking failed:', linkError);
      return { invoice, booking };
    }
  } catch (bookingError) {
    console.error('Invoice saved successfully, but linked booking creation failed:', bookingError);
    return { invoice, booking: null };
  }
}
