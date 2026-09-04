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

  const formatMoney = (amount: number) =>
    `${profile.currencySymbol || '$'}${Number(amount || 0).toLocaleString()}`;

  // Financial KPIs come from invoices, while operational KPIs come from bookings.
  // This keeps the dashboard accurate even when an invoice exists without a booking.
  const totalBookings = bookings.length;
  const totalClients = clients.length;
  const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice?.totalAmount || 0), 0);
  const pendingPayments = invoices.reduce((sum, invoice) => sum + Number(invoice?.remainingBalance || 0), 0);
  const confirmedBookings = bookings.filter((b) => b?.bookingStatus === 'Confirmed').length;
  const inquiryBookings = bookings.filter((b) => b?.bookingStatus === 'Inquiry').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = [...bookings]
    .filter((b) => b?.eventDate && b.eventDate >= todayStr && b.bookingStatus !== 'Cancelled')
    .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''))
    .slice(0, 5);

  const recentBookings = [...bookings]
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getBookingsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter((b) => b.eventDate === dateStr);
  };

  const avgBookingValue = totalBookings > 0
    ? Math.round(bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0) / totalBookings)
    : 0;
  const confirmationRate = totalBookings > 0
    ? Math.round((confirmedBookings / totalBookings) * 100)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">Business Performance & Insights</h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">Live data from your bookings, clients and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate('bookings')} className="px-3 py-2 rounded-xl bg-[#0f172a] text-white text-xs font-bold hover:opacity-90">
            <span className="inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Event</span>
          </button>
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3 py-2 rounded-xl bg-white/80 border border-white/90 text-slate-700 text-xs font-bold hover:bg-white">
            Invoices ({invoices.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3 truncate">{formatMoney(totalRevenue)}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p>
        </div>
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</span><CalendarCheck2 className="w-4 h-4 text-slate-500" /></div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{totalBookings}</div>
          <div className="flex items-center gap-2 mt-1"><span className="text-[11px] text-emerald-600 font-semibold">{confirmedBookings} Confirmed</span><span className="text-[11px] text-slate-400">•</span><span className="text-[11px] text-amber-600 font-semibold">{inquiryBookings} Inquiries</span></div>
        </div>
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upcoming Events</span><Clock className="w-4 h-4 text-slate-500" /></div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{upcomingEvents.length}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${upcomingEvents[0].eventDate}` : 'No upcoming dates'}</p>
        </div>
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Clients</span><Users className="w-4 h-4 text-slate-500" /></div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{totalClients}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Registered accounts & leads</p>
        </div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Payments</span>
          <div className="text-2xl sm:text-[26px] font-extrabold text-amber-600 mt-3 truncate">{formatMoney(pendingPayments)}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Remaining invoice balance</p>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/60">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Real Data Overview</span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight mt-1">Revenue & Reservation Summary</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-right">
            <div><span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Booking</span><span className="text-sm font-bold">{formatMoney(avgBookingValue)}</span></div>
            <div><span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Confirmation</span><span className="text-sm font-bold">{confirmationRate}%</span></div>
            <div><span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Invoiced</span><span className="text-sm font-bold">{invoices.length}</span></div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-6 gap-2 items-end h-40">
          {Array.from({ length: 6 }).map((_, index) => {
            const monthDate = new Date(year, month - (5 - index), 1);
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            const value = invoices
              .filter((invoice) => (invoice.issueDate || invoice.createdAt || '').slice(0, 7) === monthKey)
              .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
            const maxValue = Math.max(...Array.from({ length: 6 }).map((_, i) => {
              const d = new Date(year, month - (5 - i), 1);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              return invoices.filter((invoice) => (invoice.issueDate || invoice.createdAt || '').slice(0, 7) === key).reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
            }), 1);
            return <div key={monthKey} className="flex flex-col items-center justify-end h-full gap-2"><div className="w-full max-w-20 rounded-t-lg bg-slate-900/15 hover:bg-slate-900/25 transition-all" style={{ height: `${Math.max(value > 0 ? (value / maxValue) * 100 : 3, 3)}%` }} title={`${monthNames[monthDate.getMonth()]}: ${formatMoney(value)}`} /><span className="text-[10px] font-bold text-slate-400">{monthNames[monthDate.getMonth()].slice(0, 3)}</span></div>;
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-bold text-[#0f172a]">Upcoming Event Schedule</h3><p className="text-xs text-slate-500 font-medium mt-0.5">Live bookings with future event dates</p></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-bold text-slate-500 hover:text-[#0f172a] flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button></div>
          {upcomingEvents.length === 0 ? <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{upcomingEvents.map((booking) => <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 pr-3 font-bold text-xs">{booking.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs">{booking.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs">{booking.eventDate}</td><td className="py-3.5 pr-3 text-right font-bold text-xs">{formatMoney(booking.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={booking.bookingStatus} /></td></tr>)}</tbody></table></div>}
        </div>

        <div className="glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-[#0f172a]">{monthNames[month]} {year}</h3><div className="flex gap-1"><button type="button" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-xl bg-white/80 text-slate-500" aria-label="Previous month"><ChevronLeft className="w-3.5 h-3.5" /></button><button type="button" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-xl bg-white/80 text-slate-500" aria-label="Next month"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2 text-[10px] font-bold text-slate-400"><div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">{Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="py-1.5" />)}{Array.from({ length: daysInMonth }).map((_, i) => { const day = i + 1; const hasEvents = getBookingsForDay(day).length > 0; const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(); return <button type="button" key={day} onClick={() => { const event = getBookingsForDay(day)[0]; if (event) onSelectBooking(event); }} className={`py-1.5 rounded-xl font-semibold ${hasEvents ? 'bg-[#0f172a] text-white cursor-pointer' : isToday ? 'border border-[#0f172a] text-[#0f172a]' : 'text-slate-700'}`}>{day}</button>; })}</div>
          <div className="mt-6 pt-4 border-t border-white/60"><div className="flex items-center justify-between mb-3"><span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Recent Invoices</span><button type="button" onClick={() => onNavigate('invoices')} className="text-[11px] font-bold text-slate-500">View all</button></div>{invoices.length === 0 ? <p className="text-xs text-slate-400">No invoices yet.</p> : <div className="space-y-2.5">{invoices.slice(0, 3).map((invoice) => <div key={invoice.id} className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-white/80"><div className="min-w-0 pr-2"><p className="font-bold text-xs truncate">{invoice.clientName}</p><p className="text-slate-400 text-[10px] truncate">{invoice.invoiceNumber}</p></div><span className="font-bold text-emerald-600 text-xs">{formatMoney(invoice.totalAmount)}</span></div>)}</div>}</div>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-bold text-[#0f172a]">Recent Client Bookings</h3><p className="text-xs text-slate-500 font-medium mt-0.5">Latest real reservations from the database</p></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-bold text-slate-500 flex items-center gap-1">All Bookings <ArrowRight className="w-3.5 h-3.5" /></button></div>
        {recentBookings.length === 0 ? <div className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60"><tr><th className="pb-3 px-3">Client</th><th className="pb-3 px-3">Event</th><th className="pb-3 px-3">Date</th><th className="pb-3 px-3 text-right">Total</th><th className="pb-3 px-3 text-center">Payment</th><th className="pb-3 px-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{recentBookings.map((booking) => <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 px-3 font-bold text-xs">{booking.clientName}</td><td className="py-3.5 px-3 text-slate-600 text-xs">{booking.eventType}</td><td className="py-3.5 px-3 text-slate-400 text-xs">{booking.eventDate}</td><td className="py-3.5 px-3 text-right font-bold text-xs">{formatMoney(booking.totalAmount)}</td><td className="py-3.5 px-3 text-center"><StatusBadge status={booking.paymentStatus} /></td><td className="py-3.5 px-3 text-right"><StatusBadge status={booking.bookingStatus} /></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
};
