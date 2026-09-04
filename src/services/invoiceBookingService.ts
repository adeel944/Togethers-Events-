import { Invoice, Booking } from '../types';
import { bookingService } from './bookingService';
import { invoiceService } from './invoiceService';

/** Single creation flow: New Invoice creates the invoice and its linked booking. */
export async function createInvoiceWithBooking(
  invoiceData: Omit<Invoice, 'id' | 'createdAt'>
): Promise<{ invoice: Invoice; booking: Booking }> {
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
  // Keep the New Invoice form visually blank, but satisfy the database's required issue_date
  // when the user leaves Issue Date empty.
  const issueDate = invoiceData.issueDate || new Date().toISOString().split('T')[0];

  let invoice: Invoice;
  try {
    invoice = await invoiceService.createInvoice({
      ...invoiceData,
      issueDate,
      items: normalizedItems,
      bookingId: undefined,
      subtotal,
      totalAmount,
      remainingBalance: Math.max(0, totalAmount - advancePaid),
    });
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
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

    const linkedInvoice = await invoiceService.updateInvoice(invoice.id, { bookingId: booking.id });
    return { invoice: linkedInvoice, booking };
  } catch (error) {
    console.error('Linked booking creation failed; rolling back invoice:', error);
    try {
      await invoiceService.deleteInvoice(invoice.id);
    } catch (rollbackError) {
      console.error('Failed to rollback invoice after booking creation failed:', rollbackError);
    }
    throw error;
  }
}