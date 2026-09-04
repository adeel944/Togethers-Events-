import React, { useMemo, useState } from 'react';
import { CalendarCheck2, Users, Clock, ChevronLeft, ChevronRight, ArrowRight, Plus, TrendingUp } from 'lucide-react';
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
  const upcomingEvents = [...bookings].filter((b) => {
    const eventDate = normalizeDate(b?.eventDate);
    return eventDate && eventDate >= todayStr && b?.bookingStatus !== 'Cancelled';
  }).sort((a, b) => normalizeDate(a.eventDate).localeCompare(normalizeDate(b.eventDate))).slice(0, 5);
  const recentBookings = [...bookings].filter(Boolean).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getBookingsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter((b) => normalizeDate(b?.eventDate) === dateStr);
  };

  const dailyBookingData = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, dateStr, count: bookings.filter((b) => normalizeDate(b?.eventDate) === dateStr).length };
    });
  }, [bookings, daysInMonth, month, year]);
  const maxDailyBookings = Math.max(...dailyBookingData.map((item) => item.count), 1);
  const dailyTotal = dailyBookingData.reduce((sum, item) => sum + item.count, 0);
  const chartWidth = 900;
  const chartHeight = 220;
  const chartPaddingX = 28;
  const chartPaddingY = 22;
  const pointX = (index: number) => chartPaddingX + (index / Math.max(dailyBookingData.length - 1, 1)) * (chartWidth - chartPaddingX * 2);
  const pointY = (value: number) => chartHeight - chartPaddingY - (value / maxDailyBookings) * (chartHeight - chartPaddingY * 2);
  const linePoints = dailyBookingData.map((item, index) => `${pointX(index)},${pointY(item.count)}`).join(' ');
  const areaPoints = `${chartPaddingX},${chartHeight - chartPaddingY} ${linePoints} ${pointX(dailyBookingData.length - 1)},${chartHeight - chartPaddingY}`;

  const avgBookingValue = bookings.length ? Math.round(bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0) / bookings.length) : 0;
  const confirmationRate = bookings.length ? Math.round((confirmedBookings / bookings.length) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-900 shadow-[0_0_12px_rgba(15,23,42,0.25)]" /><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">Business Performance &amp; Insights</h1></div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">A clear view of your bookings, revenue and upcoming events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] text-white text-xs font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-[.98] transition-all"><span className="inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Invoice</span></button>
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 text-slate-700 text-xs font-bold hover:bg-white/80 transition-all">Invoices ({invoices.length})</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total Revenue</span><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3 truncate">{formatMoney(totalRevenue)}</div><p className="text-[11px] text-slate-500 font-medium mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total Bookings</span><CalendarCheck2 className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{bookings.length}</div><div className="flex items-center gap-2 mt-1"><span className="text-[11px] text-emerald-600 font-semibold">{confirmedBookings} Confirmed</span><span className="text-[11px] text-slate-400">•</span><span className="text-[11px] text-amber-600 font-semibold">{inquiryBookings} Inquiries</span></div></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Upcoming Events</span><Clock className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{upcomingEvents.length}</div><p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${normalizeDate(upcomingEvents[0].eventDate)}` : 'No upcoming dates'}</p></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total Clients</span><Users className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{clients.length}</div><p className="text-[11px] text-slate-500 font-medium mt-1">Registered accounts &amp; leads</p></div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Pending Payments</span><div className="text-2xl sm:text-[26px] font-extrabold text-amber-600 mt-3 truncate">{formatMoney(pendingPayments)}</div><p className="text-[11px] text-slate-500 font-medium mt-1">Remaining invoice balance</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 glass-panel p-6 sm:p-7 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/65">
            <div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Booking Activity</span><h2 className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight mt-1">Daily Bookings — {monthNames[month]} {year}</h2><p className="text-xs text-slate-500 mt-1">Bookings by event date for the selected month.</p></div>
            <div className="glass-pill px-3 py-2 rounded-2xl text-right shrink-0"><span className="block text-[9px] uppercase tracking-widest font-bold text-slate-400">Month total</span><span className="text-sm font-extrabold text-[#0f172a]">{dailyTotal} bookings</span></div>
          </div>
          <div className="mt-5 overflow-x-auto pb-1">
            <div className="min-w-[720px]">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[250px]" role="img" aria-label={`Daily bookings for ${monthNames[month]} ${year}`}>
                <defs>
                  <linearGradient id="bookingArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgba(15,23,42,0.16)" /><stop offset="100%" stopColor="rgba(15,23,42,0.01)" /></linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((row) => { const y = chartPaddingY + row * ((chartHeight - chartPaddingY * 2) / 4); const labelValue = Math.round(maxDailyBookings - row * (maxDailyBookings / 4)); return <g key={row}><line x1={chartPaddingX} x2={chartWidth - chartPaddingX} y1={y} y2={y} stroke="rgba(148,163,184,0.20)" strokeDasharray="3 5" /><text x="3" y={y + 4} fontSize="10" fill="rgba(100,116,139,0.75)">{labelValue}</text></g>; })}
                <polygon points={areaPoints} fill="url(#bookingArea)" />
                <polyline points={linePoints} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {dailyBookingData.map((item, index) => <circle key={item.dateStr} cx={pointX(index)} cy={pointY(item.count)} r={item.count > 0 ? 4 : 2.5} fill="#ffffff" stroke="#0f172a" strokeWidth={item.count > 0 ? 2.5 : 1.5}><title>{`${monthNames[month]} ${item.day}: ${item.count} booking${item.count === 1 ? '' : 's'}`}</title></circle>)}
                {dailyBookingData.map((item, index) => { const shouldShow = item.day === 1 || item.day === daysInMonth || item.day % 5 === 0; return shouldShow ? <text key={`label-${item.day}`} x={pointX(index)} y={chartHeight - 3} textAnchor="middle" fontSize="10" fontWeight="600" fill="rgba(100,116,139,0.75)">{item.day}</text> : null; })}
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/55"><span className="text-[10px] text-slate-400 font-medium">Hover points for exact daily count</span><div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><TrendingUp className="w-3.5 h-3.5" /> Event-date trend</div></div>
        </div>

        <div className="xl:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Revenue Overview</span><h2 className="text-lg font-bold text-[#0f172a] tracking-tight mt-1">Last 6 Months</h2></div><div className="glass-pill px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-500">Live</div></div>
          <div className="grid grid-cols-6 gap-2 items-end h-44">
            {Array.from({ length: 6 }).map((_, index) => {
              const monthDate = new Date(year, month - (5 - index), 1);
              const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
              const value = invoices.filter((invoice) => (invoice.issueDate || invoice.createdAt || '').slice(0, 7) === monthKey).reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
              const allValues = Array.from({ length: 6 }).map((_, i) => { const d = new Date(year, month - (5 - i), 1); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return invoices.filter((invoice) => (invoice.issueDate || invoice.createdAt || '').slice(0, 7) === key).reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0); });
              const maxValue = Math.max(...allValues, 1);
              return <div key={monthKey} className="flex flex-col items-center justify-end h-full gap-2"><div className="w-full rounded-t-xl bg-slate-900/12 hover:bg-slate-900/20 transition-all" style={{ height: `${Math.max(value > 0 ? (value / maxValue) * 100 : 3, 3)}%` }} title={`${monthNames[monthDate.getMonth()]}: ${formatMoney(value)}`} /><span className="text-[9px] font-bold text-slate-400">{monthNames[monthDate.getMonth()].slice(0, 3)}</span></div>;
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-white/55 grid grid-cols-2 gap-3"><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-bold text-slate-400">Avg booking</span><span className="block text-sm font-extrabold text-[#0f172a] mt-1 truncate">{formatMoney(avgBookingValue)}</span></div><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-bold text-slate-400">Confirmation</span><span className="block text-sm font-extrabold text-[#0f172a] mt-1">{confirmationRate}%</span></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-bold text-[#0f172a]">Upcoming Event Schedule</h3><p className="text-xs text-slate-500 font-medium mt-0.5">Live bookings with future event dates</p></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-bold text-slate-500 hover:text-[#0f172a] flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button></div>
          {upcomingEvents.length === 0 ? <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{upcomingEvents.map((booking) => <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 pr-3 font-bold text-xs">{booking.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs">{booking.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs">{normalizeDate(booking.eventDate)}</td><td className="py-3.5 pr-3 text-right font-bold text-xs">{formatMoney(booking.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={booking.bookingStatus} /></td></tr>)}</tbody></table></div>}
        </div>

        <div className="glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-[#0f172a]">{monthNames[month]} {year}</h3><div className="flex gap-1"><button type="button" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-xl bg-white/70 backdrop-blur-xl text-slate-500 border border-white/70" aria-label="Previous month"><ChevronLeft className="w-3.5 h-3.5" /></button><button type="button" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-xl bg-white/70 backdrop-blur-xl text-slate-500 border border-white/70" aria-label="Next month"><ChevronRight className="w-3.5 h-3.5" /></button></div></div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2 text-[10px] font-bold text-slate-400"><div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div></div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">{Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="py-1.5" />)}{Array.from({ length: daysInMonth }).map((_, i) => { const day = i + 1; const hasEvents = getBookingsForDay(day).length > 0; const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(); return <button type="button" key={day} onClick={() => { const event = getBookingsForDay(day)[0]; if (event) onSelectBooking(event); }} className={`py-1.5 rounded-xl font-semibold transition-all ${hasEvents ? 'bg-[#0f172a] text-white cursor-pointer shadow-sm' : isToday ? 'border border-[#0f172a] text-[#0f172a] bg-white/40' : 'text-slate-700 hover:bg-white/45'}`}>{day}</button>; })}</div>
          <div className="mt-6 pt-4 border-t border-white/60"><div className="flex items-center justify-between mb-3"><span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Recent Invoices</span><button type="button" onClick={() => onNavigate('invoices')} className="text-[11px] font-bold text-slate-500">View all</button></div>{invoices.length === 0 ? <p className="text-xs text-slate-400">No invoices yet.</p> : <div className="space-y-2.5">{invoices.slice(0, 3).map((invoice) => <div key={invoice.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/55 backdrop-blur-xl border border-white/75"><div className="min-w-0 pr-2"><p className="font-bold text-xs truncate">{invoice.clientName}</p><p className="text-slate-400 text-[10px] truncate">{invoice.invoiceNumber}</p></div><span className="font-bold text-emerald-600 text-xs">{formatMoney(getInvoiceAmount(invoice))}</span></div>)}</div>}</div>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8"><div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-bold text-[#0f172a]">Recent Client Bookings</h3><p className="text-xs text-slate-500 font-medium mt-0.5">Latest real reservations from the database</p></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-bold text-slate-500 flex items-center gap-1">All Bookings <ArrowRight className="w-3.5 h-3.5" /></button></div>{recentBookings.length === 0 ? <div className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{recentBookings.map((booking) => <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 pr-3 font-bold text-xs">{booking.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs">{booking.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs">{normalizeDate(booking.eventDate)}</td><td className="py-3.5 pr-3 text-right font-bold text-xs">{formatMoney(booking.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={booking.bookingStatus} /></td></tr>)}</tbody></table></div>}</div>
    </div>
  );
};