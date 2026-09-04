import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  FileText,
  Edit2,
  Trash2,
  UserPlus,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  Booking,
  Client,
  Vendor,
  EventType,
  BookingStatus,
  PaymentStatus,
  BusinessProfile
} from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { initialBusinessProfile } from '../../services/mockData';

interface BookingsViewProps {
  bookings?: Booking[];
  clients?: Client[];
  vendors?: Vendor[];
  profile?: BusinessProfile;
  onCreateBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'remainingAmount'>) => Promise<Booking>;
  onUpdateBooking: (id: string, updates: Partial<Booking>) => Promise<Booking>;
  onDeleteBooking: (id: string) => Promise<boolean>;
  onAssignVendor: (bookingId: string, vendorData: any) => Promise<Booking>;
  onRemoveVendor: (bookingId: string, bookingVendorId: string) => Promise<Booking>;
  onCreateInvoiceFromBooking: (bookingId: string) => void;
  selectedBookingForDetail?: Booking | null;
  onCloseDetail?: () => void;
}

const EVENT_TYPES: EventType[] = [
  'Mehndi',
  'Baraat',
  'Walima',
  'Nikkah',
  'Birthday',
  'Corporate',
  'Other',
];

const BOOKING_STATUSES: BookingStatus[] = ['Inquiry', 'Confirmed', 'Completed', 'Cancelled'];

export const BookingsView: React.FC<BookingsViewProps> = ({
  bookings: inputBookings = [],
  clients: inputClients = [],
  vendors: inputVendors = [],
  profile: inputProfile,
  onCreateBooking,
  onUpdateBooking,
  onDeleteBooking,
  onAssignVendor,
  onRemoveVendor,
  onCreateInvoiceFromBooking,
  selectedBookingForDetail,
  onCloseDetail,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const clients = Array.isArray(inputClients) ? inputClients : [];
  const vendors = Array.isArray(inputVendors) ? inputVendors : [];

  const formatMoney = (amount: number) =>
    `${profile.currencySymbol || '$'}${Number(amount || 0).toLocaleString()}`;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('All');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(
    selectedBookingForDetail || null
  );
  const [isAssignVendorOpen, setIsAssignVendorOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientId: clients[0]?.id || '',
    clientName: clients[0]?.fullName || '',
    eventType: 'Baraat' as EventType,
    eventDate: new Date().toISOString().split('T')[0],
    eventTime: '07:00 PM',
    venue: '',
    guestCount: 300,
    package: 'Signature Royal Package',
    totalAmount: 500000,
    advancePaid: 150000,
    bookingStatus: 'Confirmed' as BookingStatus,
    paymentStatus: 'Pending' as PaymentStatus,
    notes: '',
  });

  // Assign Vendor Form State
  const [assignData, setAssignData] = useState({
    vendorId: vendors[0]?.id || '',
    agreedAmount: 50000,
    paymentStatus: 'Pending' as PaymentStatus,
    notes: '',
  });

  const openAddModal = () => {
    setEditingBooking(null);
    setFormData({
      clientId: clients[0]?.id || '',
      clientName: clients[0]?.fullName || '',
      eventType: 'Baraat',
      eventDate: new Date().toISOString().split('T')[0],
      eventTime: '07:00 PM',
      venue: '',
      guestCount: 300,
      package: 'Signature Royal Package',
      totalAmount: 500000,
      advancePaid: 150000,
      bookingStatus: 'Confirmed',
      paymentStatus: 'Pending',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      clientId: booking.clientId,
      clientName: booking.clientName,
      eventType: booking.eventType,
      eventDate: booking.eventDate,
      eventTime: booking.eventTime,
      venue: booking.venue,
      guestCount: booking.guestCount,
      package: booking.package,
      totalAmount: booking.totalAmount,
      advancePaid: booking.advancePaid,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      notes: booking.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleClientSelect = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        clientId: found.id,
        clientName: found.fullName,
      }));
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBooking) {
      const updated = await onUpdateBooking(editingBooking.id, formData);
      if (detailBooking && detailBooking.id === editingBooking.id) {
        setDetailBooking(updated);
      }
    } else {
      await onCreateBooking({
        ...formData,
        assignedVendors: [],
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      await onDeleteBooking(id);
      if (detailBooking?.id === id) {
        setDetailBooking(null);
        if (onCloseDetail) onCloseDetail();
      }
    }
  };

  const handleAssignVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailBooking) return;
    const vendor = vendors.find((v) => v.id === assignData.vendorId);
    if (!vendor) return;

    const updated = await onAssignVendor(detailBooking.id, {
      vendorId: vendor.id,
      vendorName: vendor.vendorName,
      category: vendor.category,
      agreedAmount: Number(assignData.agreedAmount),
      paymentStatus: assignData.paymentStatus,
      notes: assignData.notes,
    });
    setDetailBooking(updated);
    setIsAssignVendorOpen(false);
  };

  const handleRemoveAssignedVendor = async (bookingVendorId: string) => {
    if (!detailBooking) return;
    const updated = await onRemoveVendor(detailBooking.id, bookingVendorId);
    setDetailBooking(updated);
  };

  // Filtered list
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.package.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.bookingStatus === statusFilter;
    const matchesEventType = eventTypeFilter === 'All' || b.eventType === eventTypeFilter;
    return matchesSearch && matchesStatus && matchesEventType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Bookings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your wedding, corporate and celebration reservations
          </p>
        </div>
        <button
          type="button"
          id="btn-add-booking"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 active:scale-95 text-white text-sm font-semibold shadow-xl shadow-slate-200 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Booking</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client name, venue, package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white/60 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="All">All Statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Event Type Filter */}
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white/60 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="All">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookings Table / Grid */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Create your first booking to track events, venues, payments, and assigned vendors."
          icon={Calendar}
          actionLabel="Add Booking"
          onAction={openAddModal}
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4 font-bold">Client & Event</th>
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Venue & Guests</th>
                  <th className="py-3 px-4 text-right font-bold">Financials</th>
                  <th className="py-3 px-4 text-center font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setDetailBooking(booking)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{booking.clientName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {booking.eventType}
                        </span>
                        <span className="text-xs text-slate-400 truncate max-w-[150px]">
                          {booking.package}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {booking.eventDate}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {booking.eventTime || 'TBA'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-slate-800 truncate max-w-[180px]">
                        {booking.venue || 'Venue Pending'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        {booking.guestCount} guests
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-semibold text-slate-900">
                        {formatMoney(booking.totalAmount)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Rem: <span className="font-medium text-rose-600">{formatMoney(booking.remainingAmount)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={booking.bookingStatus} />
                        <StatusBadge status={booking.paymentStatus} />
                      </div>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right space-x-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Create Invoice"
                        onClick={() => onCreateInvoiceFromBooking(booking.id)}
                        className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Edit Booking"
                        onClick={() => openEditModal(booking)}
                        className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete Booking"
                        onClick={() => handleDelete(booking.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailBooking && (
        <Modal
          isOpen={!!detailBooking}
          onClose={() => {
            setDetailBooking(null);
            if (onCloseDetail) onCloseDetail();
          }}
          title={detailBooking.clientName}
          subtitle={`${detailBooking.eventType} • ${detailBooking.eventDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top overview & status */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Event Status
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={detailBooking.bookingStatus} />
                  <StatusBadge status={detailBooking.paymentStatus} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onCreateInvoiceFromBooking(detailBooking.id);
                    setDetailBooking(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(detailBooking)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Event Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-400 font-medium">Time</span>
                <p className="font-semibold text-slate-800 mt-0.5">{detailBooking.eventTime}</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-400 font-medium">Guest Count</span>
                <p className="font-semibold text-slate-800 mt-0.5">{detailBooking.guestCount} Guests</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-400 font-medium">Total Amount</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {formatMoney(detailBooking.totalAmount)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-100">
                <span className="text-slate-400 font-medium">Remaining</span>
                <p className="font-semibold text-rose-600 mt-0.5">
                  {formatMoney(detailBooking.remainingAmount)}
                </p>
              </div>
            </div>

            {/* Venue & Notes */}
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Venue: </span>
                  <span>{detailBooking.venue || 'Not specified'}</span>
                </div>
              </div>
              {detailBooking.notes && (
                <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">Notes:</span>
                  {detailBooking.notes}
                </div>
              )}
            </div>

            {/* Assigned Vendors Section */}
            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Assigned Vendors</h3>
                  <p className="text-xs text-slate-500">Decorators, caterers & media assigned to this event</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignVendorOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Vendor</span>
                </button>
              </div>

              {detailBooking.assignedVendors.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No vendors currently assigned to this booking.
                </p>
              ) : (
                <div className="space-y-2">
                  {detailBooking.assignedVendors.map((bv) => (
                    <div
                      key={bv.id}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{bv.vendorName}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                            {bv.category}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-1 flex items-center gap-3">
                          <span>Agreed: <strong className="text-slate-800">{formatMoney(bv.agreedAmount)}</strong></span>
                          <StatusBadge status={bv.paymentStatus} />
                          {bv.notes && <span className="italic text-slate-400 truncate max-w-[200px]">{bv.notes}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignedVendor(bv.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove vendor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Booking Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBooking ? 'Edit Booking' : 'Add New Booking'}
        subtitle="Specify client details, venue, package and financial commitments"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-sm">
          {/* Client selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Client <span className="text-rose-500">*</span>
            </label>
            {clients.length === 0 ? (
              <p className="text-xs text-rose-500">Please add a client first in the Clients section.</p>
            ) : (
              <select
                value={formData.clientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-slate-900"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone || c.city || 'No contact'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Event Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Event Type
              </label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value as EventType })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Package */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Package / Service Name
              </label>
              <input
                type="text"
                value={formData.package}
                onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                placeholder="e.g. Royal Heritage Package"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Event Date
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Event Time
              </label>
              <input
                type="text"
                value={formData.eventTime}
                onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                placeholder="07:00 PM"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            {/* Guest Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Guest Count
              </label>
              <input
                type="number"
                min="1"
                value={formData.guestCount}
                onChange={(e) => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Venue
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="e.g. Serena Marquee, Grand Ballroom"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          {/* Financials: Total & Advance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Total Amount ({profile.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Advance Paid ({profile.currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.advancePaid}
                  onChange={(e) => setFormData({ ...formData, advancePaid: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold"
                />
              </div>
            </div>

            {/* Calculated Remaining Amount */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 font-medium">
              <span className="text-slate-500">Automatically Calculated Remaining:</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatMoney(Math.max(0, formData.totalAmount - (formData.advancePaid || 0)))}
              </span>
            </div>
          </div>

          {/* Statuses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Booking Status
              </label>
              <select
                value={formData.bookingStatus}
                onChange={(e) =>
                  setFormData({ ...formData, bookingStatus: e.target.value as BookingStatus })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) =>
                  setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Event Notes & Special Instructions
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Stage dimensions, floral color preferences, entry timings..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-xs"
            >
              {editingBooking ? 'Save Changes' : 'Create Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Vendor Modal */}
      <Modal
        isOpen={isAssignVendorOpen}
        onClose={() => setIsAssignVendorOpen(false)}
        title="Assign Vendor to Booking"
        subtitle={detailBooking ? `Assign to ${detailBooking.clientName}'s ${detailBooking.eventType}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleAssignVendorSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Vendor
            </label>
            <select
              value={assignData.vendorId}
              onChange={(e) => setAssignData({ ...assignData, vendorId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
              required
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vendorName} ({v.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Agreed Amount ({profile.currencySymbol})
            </label>
            <input
              type="number"
              min="0"
              value={assignData.agreedAmount}
              onChange={(e) => setAssignData({ ...assignData, agreedAmount: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <select
              value={assignData.paymentStatus}
              onChange={(e) =>
                setAssignData({ ...assignData, paymentStatus: e.target.value as PaymentStatus })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Scope / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Stage floral canopy + 10 round tables"
              value={assignData.notes}
              onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignVendorOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-xs"
            >
              Assign Vendor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
