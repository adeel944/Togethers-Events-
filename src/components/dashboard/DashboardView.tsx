import React, { useState } from 'react';
import { CalendarCheck2, Users, Clock, ChevronLeft, ChevronRight, ArrowRight, Plus } from 'lucide-react';
import { Booking, Client, Invoice, BusinessProfile, NavTab } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { initialBusinessProfile } from '../../services/mockData';

interface DashboardViewProps {
  bookings?: Booking[];
  clients?: Client[];
  invoices?: Invoice[];
  profile?: BusinessProfile;
  onNavigate: (tab: NavTab) => void;
  onSelectBooking: (booking: Booking) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bookings: inputBookings = [],
  clients: inputClients = [],
  invoices: inputInvoices = [],
  profile: inputProfile,
  onNavigate,
  onSelectBooking,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const clients = Array.isArray(inputClients) ? inputClients : [];
  const invoices = Array.isArray(inputInvoices) ? inputInvoices : [];
  const [calendarDate, setCalendarDate] = useState(new Date());

  const formatMoney = (amount: number) => `${profile.currencySymbol || 'Rs. '}${Number(amount || 0).toLocaleString()}`;
  const normalizeDate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : raw;
  };
  const getInvoiceAmount = (invoice: Invoice) => {
    const stored = Number(invoice?.totalAmount || 0);
    if (stored > 0) return stored;
    if (invoice?.bookingId) {
      const linkedBooking = bookings.find((booking) => booking.id === invoice.bookingId);
      const bookingAmount = Number(linkedBooking?.totalAmount || 0);
      if (bookingAmount > 0) return bookingAmount;
    }
    const itemTotal = (invoice?.items || []).reduce((sum, item) => sum + Number(item?.total || (Number(item?.quantity || 0) * Number(item?.unitPrice || 0))), 0);
    const subtotal = Number(invoice?.subtotal || 0);
    return Math.max(0, subtotal > 0 ? subtotal - Number(invoice?.discount || 0) + Number(invoice?.tax || 0) : itemTotal);
  };
  const getInvoiceRemaining = (invoice: Invoice) => {
    const stored = Number(invoice?.remainingBalance || 0);
    if (stored > 0) return stored;
    return Math.max(0, getInvoiceAmount(invoice) - Number(invoice?.advancePaid || 0));
  };

  const totalRevenue = invoices.reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
  const pendingPayments = invoices.reduce((sum, invoice) => sum + getInvoiceRemaining(invoice), 0);
  const confirmedBookings = bookings.filter((b) => b?.bookingStatus === 'Confirmed').length;
  const inquiryBookings = bookings.filter((b) => b?.bookingStatus === 'Inquiry').length;
  const todayStr = normalizeDate(new Date().toISOString());
  const upcomingEvents = [...bookings]
    .filter((b) => {
      const eventDate = normalizeDate(b?.eventDate);
      return eventDate && eventDate >= todayStr && b?.bookingStatus !== 'Cancelled';
    })
    .sort((a, b) => normalizeDate(a.eventDate).localeCompare(normalizeDate(b.eventDate)));
  const recentBookings = [...bookings]
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getBookingsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter((b) => normalizeDate(b?.eventDate) === dateStr && b?.bookingStatus !== 'Cancelled');
  };

  const avgBookingValue = bookings.length
    ? Math.round(bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0) / bookings.length)
    : 0;
  const confirmationRate = bookings.length ? Math.round((confirmedBookings / bookings.length) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-900 shadow-[0_0_12px_rgba(15,23,42,0.25)]" /><h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a]">Business Performance &amp; Insights</h1></div>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">A clear view of your bookings, revenue and upcoming events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] text-white text-xs font-semibold shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-[.98] transition-all"><span className="inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Invoice</span></button>
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 text-slate-700 text-xs font-semibold hover:bg-white/80 transition-all">Invoices ({invoices.length})</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Revenue</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3 truncate">{formatMoney(totalRevenue)}</div><p className="text-[11px] text-slate-500 font-normal mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Bookings</span><CalendarCheck2 className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{bookings.length}</div><div className="flex items-center gap-2 mt-1"><span className="text-[11px] text-emerald-600 font-medium">{confirmedBookings} Confirmed</span><span className="text-[11px] text-slate-400">•</span><span className="text-[11px] text-amber-600 font-medium">{inquiryBookings} Inquiries</span></div></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Upcoming Events</span><Clock className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{upcomingEvents.length}</div><p className="text-[11px] text-slate-500 font-normal mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${normalizeDate(upcomingEvents[0].eventDate)}` : 'No upcoming dates'}</p></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Clients</span><Users className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{clients.length}</div><p className="text-[11px] text-slate-500 font-normal mt-1">Registered accounts &amp; leads</p></div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Pending Payments</span><div className="text-2xl sm:text-[26px] font-medium text-amber-600 mt-3 truncate">{formatMoney(pendingPayments)}</div><p className="text-[11px] text-slate-500 font-normal mt-1">Remaining invoice balance</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Events Calendar</span><h2 className="text-lg sm:text-xl font-semibold text-[#0f172a] tracking-tight mt-1">{monthNames[month]} {year}</h2><p className="text-xs text-slate-500 mt-1 font-normal">Bookings are shown on their event date.</p></div>
            <div className="flex items-center gap-1"><button type="button" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 rounded-xl bg-white/70 backdrop-blur-xl text-slate-500 border border-white/70 hover:bg-white" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button><button type="button" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 rounded-xl bg-white/70 backdrop-blur-xl text-slate-500 border border-white/70 hover:bg-white" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button></div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2 text-[10px] font-medium text-slate-400"><div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div></div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="py-2" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayBookings = getBookingsForDay(day);
              const hasEvents = dayBookings.length > 0;
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              return <button type="button" key={day} onClick={() => { const event = dayBookings[0]; if (event) onSelectBooking(event); }} className={`min-h-9 py-2 rounded-xl font-medium transition-all ${hasEvents ? 'bg-[#0f172a] text-white cursor-pointer shadow-sm' : isToday ? 'border border-[#0f172a] text-[#0f172a] bg-white/40' : 'text-slate-700 hover:bg-white/45'}`} title={hasEvents ? `${dayBookings.length} booking${dayBookings.length === 1 ? '' : 's'}` : undefined}>{day}</button>;
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-white/60 grid grid-cols-2 gap-3"><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Avg booking</span><span className="block text-sm font-medium text-[#0f172a] mt-1 truncate">{formatMoney(avgBookingValue)}</span></div><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Confirmation</span><span className="block text-sm font-medium text-[#0f172a] mt-1">{confirmationRate}%</span></div></div>
        </div>

        <div className="xl:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Upcoming Schedule</span><h2 className="text-lg font-semibold text-[#0f172a] tracking-tight mt-1">Next Events</h2></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 hover:text-[#0f172a] flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button></div>
          {upcomingEvents.length === 0 ? <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div> : <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">{upcomingEvents.map((booking) => <button type="button" key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/45 backdrop-blur-xl border border-white/65 hover:bg-white/65 transition-all"><div className="min-w-0"><p className="font-medium text-sm text-[#0f172a] truncate">{booking.clientName}</p><p className="text-[11px] text-slate-500 mt-0.5 truncate">{booking.eventType} • {normalizeDate(booking.eventDate)}</p></div><div className="text-right shrink-0"><p className="font-medium text-xs text-[#0f172a]">{formatMoney(booking.totalAmount)}</p><div className="mt-1"><StatusBadge status={booking.bookingStatus} /></div></div></button>)}</div>}
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8"><div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-semibold text-[#0f172a]">Recent Client Bookings</h3><p className="text-xs text-slate-500 font-normal mt-0.5">Latest real reservations from the database</p></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">All Bookings <ArrowRight className="w-3.5 h-3.5" /></button></div>{recentBookings.length === 0 ? <div className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-medium border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{recentBookings.map((booking) => <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 pr-3 font-medium text-xs">{booking.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs font-normal">{booking.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs font-normal">{normalizeDate(booking.eventDate)}</td><td className="py-3.5 pr-3 text-right font-medium text-xs">{formatMoney(booking.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={booking.bookingStatus} /></td></tr>)}</tbody></table></div>}</div>
    </div>
  );
};