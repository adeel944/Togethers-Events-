import { Invoice, InvoiceItem } from '../types';
import { initialInvoices } from './mockData';
import { businessService } from './businessService';
import { bookingService } from './bookingService';
import { clientService } from './clientService';

const INVOICES_KEY = 'together_events_invoices';

export const invoiceService = {
  async getInvoices(): Promise<Invoice[]> {
    try {
      const data = localStorage.getItem(INVOICES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    localStorage.setItem(INVOICES_KEY, JSON.stringify(initialInvoices));
    return [...initialInvoices];
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const invoices = await this.getInvoices();
    return invoices.find((inv) => inv.id === id) || null;
  },

  async generateNextInvoiceNumber(): Promise<string> {
    const profile = await businessService.getProfile();
    const invoices = await this.getInvoices();
    
    // Extract numbers matching the prefix or calculate from starting number
    const prefix = profile.invoicePrefix || 'TE-';
    const startingNumber = profile.invoiceStartingNumber || 1001;

    let maxNum = startingNumber - 1;
    for (const inv of invoices) {
      if (inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${prefix}${nextNum}`;
  },

  async createInvoice(payload: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const invoices = await this.getInvoices();
    const newInvoice: Invoice = {
      ...payload,
      id: 'inv-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newInvoice, ...invoices];
    localStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
    return newInvoice;
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const invoices = await this.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error('Invoice not found');
    }
    const current = invoices[index];

    // Re-calculate financial totals if items, discount, tax, or advancePaid changed
    const items = updates.items || current.items;
    const subtotal = items.reduce((acc, item) => acc + (item.total || item.quantity * item.unitPrice), 0);
    const discount = updates.discount !== undefined ? updates.discount : current.discount;
    const tax = updates.tax !== undefined ? updates.tax : current.tax;
    const totalAmount = Math.max(0, subtotal - discount + tax);
    const advancePaid = updates.advancePaid !== undefined ? updates.advancePaid : current.advancePaid;
    const remainingBalance = Math.max(0, totalAmount - advancePaid);

    let paymentStatus: Invoice['paymentStatus'] = 'Pending';
    if (advancePaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else {
      paymentStatus = 'Pending';
    }

    const updatedInvoice: Invoice = {
      ...current,
      ...updates,
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
      advancePaid,
      remainingBalance,
      paymentStatus,
    };

    invoices[index] = updatedInvoice;
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    return updatedInvoice;
  },

  async deleteInvoice(id: string): Promise<boolean> {
    const invoices = await this.getInvoices();
    const filtered = invoices.filter((i) => i.id !== id);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(filtered));
    return true;
  },

  async duplicateInvoice(id: string): Promise<Invoice> {
    const original = await this.getInvoiceById(id);
    if (!original) throw new Error('Original invoice not found');

    const nextInvoiceNumber = await this.generateNextInvoiceNumber();
    const duplicated: Invoice = {
      ...original,
      id: 'inv-' + Date.now(),
      invoiceNumber: nextInvoiceNumber,
      issueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    const invoices = await this.getInvoices();
    const updated = [duplicated, ...invoices];
    localStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
    return duplicated;
  },

  async createInvoiceFromBooking(bookingId: string): Promise<Invoice> {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const client = await clientService.getClientById(booking.clientId);
    const profile = await businessService.getProfile();
    const settings = await businessService.getInvoiceSettings();
    const nextInvoiceNumber = await this.generateNextInvoiceNumber();

    const items: InvoiceItem[] = [
      {
        id: 'item-' + Date.now(),
        description: `${booking.eventType} Event Management & Venue Setup (${booking.package || 'Custom Package'})`,
        quantity: 1,
        unitPrice: booking.totalAmount,
        total: booking.totalAmount,
      },
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    const newInvoice: Omit<Invoice, 'id' | 'createdAt'> = {
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
      paymentStatus:
        booking.advancePaid >= booking.totalAmount && booking.totalAmount > 0
          ? 'Paid'
          : 'Pending',
      termsAndConditions: profile.defaultTerms,
      notes: booking.notes || '',
      templateId: settings.defaultTemplate || 'modern',
    };

    return this.createInvoice(newInvoice);
  },
};
