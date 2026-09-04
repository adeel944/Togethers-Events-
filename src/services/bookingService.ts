import { Booking, BookingVendor } from '../types';
import { initialBookings } from './mockData';

const BOOKINGS_KEY = 'together_events_bookings';

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    try {
      const data = localStorage.getItem(BOOKINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(initialBookings));
    return [...initialBookings];
  },

  async getBookingById(id: string): Promise<Booking | null> {
    const bookings = await this.getBookings();
    return bookings.find((b) => b.id === id) || null;
  },

  async createBooking(
    payload: Omit<Booking, 'id' | 'createdAt' | 'remainingAmount'>
  ): Promise<Booking> {
    const bookings = await this.getBookings();
    const remainingAmount = Math.max(0, payload.totalAmount - (payload.advancePaid || 0));
    
    // Auto sync payment status if needed
    let paymentStatus: Booking['paymentStatus'] = 'Pending';
    if (payload.advancePaid >= payload.totalAmount && payload.totalAmount > 0) {
      paymentStatus = 'Paid';
    } else {
      paymentStatus = 'Pending';
    }

    const newBooking: Booking = {
      ...payload,
      paymentStatus,
      remainingAmount,
      id: 'bok-' + Date.now(),
      assignedVendors: payload.assignedVendors || [],
      createdAt: new Date().toISOString(),
    };
    const updated = [newBooking, ...bookings];
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));
    return newBooking;
  },

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const bookings = await this.getBookings();
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error('Booking not found');
    }
    const current = bookings[index];
    const totalAmount = updates.totalAmount !== undefined ? updates.totalAmount : current.totalAmount;
    const advancePaid = updates.advancePaid !== undefined ? updates.advancePaid : current.advancePaid;
    const remainingAmount = Math.max(0, totalAmount - advancePaid);

    let paymentStatus: Booking['paymentStatus'] = 'Pending';
    if (advancePaid >= totalAmount && totalAmount > 0) {
      paymentStatus = 'Paid';
    } else {
      paymentStatus = 'Pending';
    }

    const updatedBooking: Booking = {
      ...current,
      ...updates,
      totalAmount,
      advancePaid,
      remainingAmount,
      paymentStatus,
    };
    bookings[index] = updatedBooking;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    return updatedBooking;
  },

  async deleteBooking(id: string): Promise<boolean> {
    const bookings = await this.getBookings();
    const filtered = bookings.filter((b) => b.id !== id);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(filtered));
    return true;
  },

  async assignVendorToBooking(
    bookingId: string,
    vendorData: Omit<BookingVendor, 'id'>
  ): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const newBookingVendor: BookingVendor = {
      ...vendorData,
      id: 'bv-' + Date.now(),
    };
    const updatedAssigned = [...booking.assignedVendors, newBookingVendor];
    return this.updateBooking(bookingId, { assignedVendors: updatedAssigned });
  },

  async assignVendor(bookingId: string, vendorData: Omit<BookingVendor, 'id'>): Promise<Booking> {
    return this.assignVendorToBooking(bookingId, vendorData);
  },

  async removeVendorFromBooking(bookingId: string, bookingVendorId: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    const updatedAssigned = booking.assignedVendors.filter((v) => v.id !== bookingVendorId);
    return this.updateBooking(bookingId, { assignedVendors: updatedAssigned });
  },

  async removeAssignedVendor(bookingId: string, bookingVendorId: string): Promise<Booking> {
    return this.removeVendorFromBooking(bookingId, bookingVendorId);
  },
};
