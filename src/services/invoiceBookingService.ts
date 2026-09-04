import { Invoice, Booking } from '../types';
import { bookingService } from './bookingService';
import { invoiceService } from './invoiceService';

/** Single creation flow: New Invoice creates the invoice and its linked booking. */
export async function createInvoiceWithBooking(
  invoiceData: Omit<Invoice, 'id' | 'createdAt'>
): Promise<{ invoice: Invoice; booking: Booking }> {
  // Always calculate the amount from the values currently entered in the form.
  // Do not trust a stale totalAmount/item.total coming from an earlier render.
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

  const booking = await bookingService.createBooking({
    clientId: invoiceData.clientId,
    clientName: invoiceData.clientName,
    eventType: invoiceData.eventType,
    eventDate: invoiceData.eventDate,
    eventTime: invoiceData.eventTime || '',
    venue: invoiceData.venue || '',
    guestCount: Math.max(0, Number(invoiceData.guestCount || 0)),
    package: packageName,
    totalAmount,
    advancePaid,
    bookingStatus: 'Confirmed',
    paymentStatus: advancePaid >= totalAmount && totalAmount > 0 ? 'Paid' : 'Pending',
    notes: invoiceData.notes || '',
    assignedVendors: [],
  });

  try {
    const invoice = await invoiceService.createInvoice({
      ...invoiceData,
      items: normalizedItems,
      bookingId: booking.id,
      subtotal,
      totalAmount,
      remainingBalance: Math.max(0, totalAmount - advancePaid),
    });
    return { invoice, booking };
  } catch (error) {
    try {
      await bookingService.deleteBooking(booking.id);
    } catch (rollbackError) {
      console.error('Failed to rollback booking after invoice creation failed:', rollbackError);
    }
    throw error;
  }
}