import { Invoice, Booking } from '../types';
import { bookingService } from './bookingService';
import { invoiceService } from './invoiceService';

/** Single creation flow: New Invoice creates the invoice and its linked booking. */
export async function createInvoiceWithBooking(
  invoiceData: Omit<Invoice, 'id' | 'createdAt'>
): Promise<{ invoice: Invoice; booking: Booking }> {
  const firstItem = invoiceData.items?.[0];
  const packageName = firstItem?.description?.trim() || 'Custom Package';
  const totalAmount = Math.max(0, Number(invoiceData.totalAmount || 0));
  const advancePaid = Math.max(0, Number(invoiceData.advancePaid || 0));

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
      bookingId: booking.id,
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