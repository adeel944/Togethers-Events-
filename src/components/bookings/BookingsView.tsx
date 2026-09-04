import React, { useState } from 'react';
import { Search, Calendar, MapPin, Users, Edit2, Trash2, Clock } from 'lucide-react';
import { Booking, Client, Vendor, BookingStatus, BusinessProfile } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { initialBusinessProfile } from '../../services/mockData';

interface BookingsViewProps {
  bookings?: Booking[];
  clients?: Client[];
  vendors?: Vendor[];
  profile?: BusinessProfile;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => Promise<Booking>;
  onDeleteBooking: (id: string) => Promise<boolean>;
  onAssignVendor: (bookingId: string, vendorData: any) => Promise<Booking>;
  onRemoveVendor: (bookingId: string, bookingVendorId: string) => Promise<Booking>;
  selectedBookingForDetail?: Booking | null;
  onCloseDetail?: () => void;
}

const BOOKING_STATUSES: BookingStatus[] = ['Inquiry', 'Confirmed', 'Completed', 'Cancelled'];

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookings: inputBookings = [],
  profile: inputProfile,
  onUpdateBooking,
  onDeleteBooking,
  selectedBookingForDetail,
  onCloseDetail,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [detailBooking, setDetailBooking] = useState<Booking | null>(selectedBookingForDetail || null);

  const formatMoney = (amount: number) => `${profile.currencySymbol || '$'}${Number(amount || 0).toLocaleString()}`;

  const filteredBookings = bookings.filter((b) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = [b.clientName, b.venue, b.package, b.eventType].some((value) => String(value || '').toLowerCase().includes(query));
    return matchesSearch && (statusFilter === 'All' || b.bookingStatus === statusFilter);
  });

  React.useEffect(() => {
    setDetailBooking(selectedBookingForDetail || null);
  }, [selectedBookingForDetail]);

  const closeDetail = () => {
    setDetailBooking(null);
    onCloseDetail?.();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    await onDeleteBooking(id);
    if (detailBooking?.id === id) closeDetail();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Bookings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Bookings are created automatically when you save a New Invoice.</p>
      </div>

      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search by client, event, venue or package..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs font-semibold bg-white/60 border border-slate-200 rounded-xl text-slate-700">
          <option value="All">All Statuses</option>
          {BOOKING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {filteredBookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Create a New Invoice to automatically create the linked booking." icon={Calendar} />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead><tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-4">Client & Event</th><th className="py-3 px-4">Date & Time</th><th className="py-3 px-4">Venue & Guests</th><th className="py-3 px-4 text-right">Financials</th><th className="py-3 px-4 text-center">Status</th><th className="py-3 px-4 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setDetailBooking(booking)}>
                    <td className="py-3.5 px-4"><div className="font-semibold text-slate-900">{booking.clientName}</div><div className="text-xs text-slate-500 mt-0.5">{booking.eventType} • {booking.package}</div></td>
                    <td className="py-3.5 px-4"><div className="font-mono text-xs font-semibold">{booking.eventDate}</div><div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{booking.eventTime || 'TBA'}</div></td>
                    <td className="py-3.5 px-4"><div className="text-xs font-medium">{booking.venue || 'Venue Pending'}</div><div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" />{booking.guestCount || 0} guests</div></td>
                    <td className="py-3.5 px-4 text-right"><div className="font-semibold">{formatMoney(booking.totalAmount)}</div><div className="text-xs text-slate-500">Rem: {formatMoney(booking.remainingAmount)}</div></td>
                    <td className="py-3.5 px-4 text-center"><div className="flex flex-col items-center gap-1"><StatusBadge status={booking.bookingStatus} /><StatusBadge status={booking.paymentStatus} /></div></td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}><button type="button" title="Edit Booking" onClick={() => setDetailBooking(booking)} className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg"><Edit2 className="w-4 h-4" /></button><button type="button" title="Delete Booking" onClick={() => handleDelete(booking.id)} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailBooking && (
        <Modal isOpen={true} onClose={closeDetail} title={detailBooking.clientName} subtitle={`${detailBooking.eventType} • ${detailBooking.eventDate}`} maxWidth="2xl">
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs text-slate-400 uppercase font-semibold">Status</span><div className="flex gap-2 mt-1"><StatusBadge status={detailBooking.bookingStatus} /><StatusBadge status={detailBooking.paymentStatus} /></div></div><button type="button" onClick={() => handleDelete(detailBooking.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold"><Trash2 className="w-3.5 h-3.5" /> Delete</button></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"><div className="p-3 rounded-xl bg-white border"><span className="text-slate-400">Date</span><p className="font-semibold mt-1">{detailBooking.eventDate}</p></div><div className="p-3 rounded-xl bg-white border"><span className="text-slate-400">Time</span><p className="font-semibold mt-1">{detailBooking.eventTime || 'TBA'}</p></div><div className="p-3 rounded-xl bg-white border"><span className="text-slate-400">Total</span><p className="font-semibold mt-1">{formatMoney(detailBooking.totalAmount)}</p></div><div className="p-3 rounded-xl bg-white border"><span className="text-slate-400">Remaining</span><p className="font-semibold text-rose-600 mt-1">{formatMoney(detailBooking.remainingAmount)}</p></div></div>
            <div className="space-y-3 text-sm"><div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-400 mt-0.5" /><span><strong>Venue:</strong> {detailBooking.venue || 'Not specified'}</span></div><div className="flex items-start gap-2"><Users className="w-4 h-4 text-slate-400 mt-0.5" /><span><strong>Guests:</strong> {detailBooking.guestCount || 0}</span></div><div className="p-3 rounded-xl bg-slate-50 text-xs"><strong>Package:</strong> {detailBooking.package || 'Not specified'}</div>{detailBooking.notes && <div className="p-3 rounded-xl bg-slate-50 text-xs"><strong>Notes:</strong> {detailBooking.notes}</div>}</div>
          </div>
        </Modal>
      )}
    </div>
  );
};
