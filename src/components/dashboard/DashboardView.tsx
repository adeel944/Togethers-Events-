import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Plus } from 'lucide-react';
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

type Range = 'month' | '3months' | 'year';
type ChartPoint = { label: string; booking: number; expense: number };

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
  const [range, setRange] = useState<Range>('month');
  const [chartMonth, setChartMonth] = useState(new Date());

  const money = (n: number) => `${profile.currencySymbol || 'Rs. '}${Number(n || 0).toLocaleString()}`;
  const normalizeDate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : raw;
  };

  const getInvoiceAmount = (invoice: Invoice) => {
    const stored = Number(invoice?.totalAmount || 0);
    if (stored > 0) return stored;
    if (invoice?.bookingId) {
      const booking = bookings.find((item) => item.id === invoice.bookingId);
      if (Number(booking?.totalAmount || 0) > 0) return Number(booking?.totalAmount || 0);
    }
    const itemTotal = (invoice?.items || []).reduce(
      (sum, item) => sum + Number(item?.total || Number(item?.quantity || 0) * Number(item?.unitPrice || 0)),
      0,
    );
    const subtotal = Number(invoice?.subtotal || 0);
    return Math.max(0, subtotal > 0 ? subtotal - Number(invoice?.discount || 0) + Number(invoice?.tax || 0) : itemTotal);
  };

  const totalRevenue = invoices.reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
  const pendingPayments = invoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice?.remainingBalance || 0) || getInvoiceAmount(invoice) - Number(invoice?.advancePaid || 0)),
    0,
  );
  const confirmedBookings = bookings.filter((booking) => booking?.bookingStatus === 'Confirmed').length;
  const completedCount = bookings.filter((booking) => String(booking.bookingStatus).toLowerCase() === 'completed').length;
  const todayStr = normalizeDate(new Date().toISOString());

  const upcomingEvents = [...bookings]
    .filter((booking) => {
      const date = normalizeDate(booking?.eventDate);
      return date && date >= todayStr && booking?.bookingStatus !== 'Cancelled';
    })
    .sort((a, b) => normalizeDate(a.eventDate).localeCompare(normalizeDate(b.eventDate)));

  const recentBookings = [...bookings]
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getBookingsForDay = (y: number, m: number, d: number) => {
    const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return bookings.filter((booking) => normalizeDate(booking.eventDate) === date && booking.bookingStatus !== 'Cancelled');
  };

  const chartData = useMemo<ChartPoint[]>(() => {
    const selectedYear = chartMonth.getFullYear();
    const selectedMonth = chartMonth.getMonth();
    const start = new Date(selectedYear, selectedMonth, 1);
    const count = range === 'month' ? new Date(selectedYear, selectedMonth + 1, 0).getDate() : range === '3months' ? 3 : 12;
    const points: ChartPoint[] = [];

    const expenseForDate = (y: number, m: number, d: number) => bookings
      .filter((b) => normalizeDate(b.eventDate) === `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
      .reduce((sum, b) => sum + (b.assignedVendors || []).reduce((vendorSum, vendor) => vendorSum + Number(vendor.paidAmount || 0), 0), 0);

    if (range === 'month') {
      for (let day = 1; day <= count; day += 1) {
        points.push({ label: String(day), booking: getBookingsForDay(selectedYear, selectedMonth, day).length, expense: expenseForDate(selectedYear, selectedMonth, day) });
      }
    } else {
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(start.getFullYear(), start.getMonth() - index, 1);
        let booking = 0;
        let expense = 0;
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day += 1) {
          booking += getBookingsForDay(date.getFullYear(), date.getMonth(), day).length;
          expense += expenseForDate(date.getFullYear(), date.getMonth(), day);
        }
        points.push({ label: monthNames[date.getMonth()].slice(0, 3), booking, expense });
      }
    }
    return points;
  }, [bookings, chartMonth, range]);

  const maxBooking = Math.max(1, ...chartData.map((point) => point.booking));
  const maxExpense = Math.max(1, ...chartData.map((point) => point.expense));
  const chartTitle = range === 'month' ? `${monthNames[chartMonth.getMonth()]} ${chartMonth.getFullYear()}` : range === '3months' ? 'Last 3 Months' : 'Last 12 Months';
  const avg = bookings.length ? Math.round(bookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0) / bookings.length) : 0;
  const rate = bookings.length ? Math.round((confirmedBookings / bookings.length) * 100) : 0;

  // ECG-inspired path: real booking/expense data controls the signal, while short pulse peaks give it a premium monitor feel.
  const buildEcgPath = (key: 'booking' | 'expense') => {
    if (!chartData.length) return '';
    const max = key === 'booking' ? maxBooking : maxExpense;
    const values = chartData.map((point, index) => {
      const current = point[key];
      const previous = chartData[index - 1]?.[key] ?? current;
      const next = chartData[index + 1]?.[key] ?? current;
      return previous * 0.2 + current * 0.6 + next * 0.2;
    });
    const points = values.map((value, index) => ({
      x: chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100,
      y: 78 - (value / max) * 50,
    }));
    if (points.length === 1) return 'M 0 78 L 38 78 L 46 78 L 49 78 L 50 28 L 51 78 L 54 78 L 62 78 L 100 78';

    let path = `M 0 ${points[0].y}`;
    points.forEach((point, index) => {
      if (index === 0) return;
      const previous = points[index - 1];
      const dx = point.x - previous.x;
      const pulse = Math.min(9, Math.max(3, Math.abs(point.y - previous.y) * 0.24));
      const base = previous.y + (point.y - previous.y) * 0.5;
      path += ` L ${previous.x + dx * 0.24} ${previous.y}`;
      path += ` L ${previous.x + dx * 0.39} ${previous.y + pulse}`;
      path += ` L ${previous.x + dx * 0.50} ${base}`;
      path += ` L ${previous.x + dx * 0.61} ${previous.y - pulse}`;
      path += ` L ${point.x} ${point.y}`;
    });
    return `${path} L 100 ${points[points.length - 1].y}`;
  };

  const bookingEcgPath = buildEcgPath('booking');
  const expenseEcgPath = buildEcgPath('expense');

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-900" /><h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a]">Business Performance &amp; Insights</h1></div>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">A clear view of your bookings, revenue and upcoming events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] text-white text-xs font-medium"><Plus className="w-3.5 h-3.5 inline mr-1" />New Invoice</button>
          <button onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 text-slate-700 text-xs font-medium">Invoices ({invoices.length})</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Revenue</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3 truncate">{money(totalRevenue)}</div><p className="text-[11px] text-slate-500 mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p></div>
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Bookings</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{bookings.length}</div><div className="flex items-center gap-3 mt-1 text-[11px]"><span><strong className="text-[#0f172a]">{confirmedBookings}</strong> Bookings Confirm</span><span><strong className="text-red-500">{completedCount}</strong> Event Done</span></div></div>
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Upcoming Events</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{upcomingEvents.length}</div><p className="text-[11px] text-slate-500 mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${normalizeDate(upcomingEvents[0].eventDate)}` : 'No upcoming dates'}</p></div>
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Clients</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{clients.length}</div><p className="text-[11px] text-slate-500 mt-1">Registered accounts &amp; leads</p></div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Pending Payments</span><div className="text-2xl sm:text-[26px] font-medium text-amber-600 mt-3 truncate">{money(pendingPayments)}</div><p className="text-[11px] text-slate-500 mt-1">Remaining invoice balance</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Financial Activity</span><h2 className="text-lg sm:text-xl font-semibold text-[#0f172a] tracking-tight mt-1">{chartTitle}</h2></div>
            <div className="flex rounded-xl bg-white/55 backdrop-blur-xl border border-white/80 p-1">{(['month','3months','year'] as Range[]).map((item) => <button key={item} onClick={() => setRange(item)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-medium ${range === item ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:bg-white/70'}`}>{item === 'month' ? 'Month' : item === '3months' ? '3M' : '1Y'}</button>)}</div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-[9px] font-medium"><span className="flex items-center gap-1.5 text-sky-600"><i className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.55)]" />Bookings</span><span className="flex items-center gap-1.5 text-rose-500"><i className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]" />Expenses</span></div>
            <div className="flex items-center gap-1"><button onClick={() => setChartMonth(new Date(chartMonth.getFullYear(), chartMonth.getMonth() - 1, 1))} className="p-1.5 rounded-lg bg-white/60 border border-white/80 text-slate-500" aria-label="Previous chart month"><ChevronLeft className="w-3.5 h-3.5" /></button><button onClick={() => setChartMonth(new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 1))} className="p-1.5 rounded-lg bg-white/60 border border-white/80 text-slate-500" aria-label="Next chart month"><ChevronRight className="w-3.5 h-3.5" /></button></div>
          </div>

          <div className="relative h-[340px] overflow-hidden rounded-[22px] border border-slate-700/40 bg-[#07111f] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-30px_60px_rgba(2,6,23,0.45),0_20px_50px_rgba(15,23,42,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(14,165,233,0.14),transparent_48%)]" />
            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(56,189,248,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.18)_1px,transparent_1px)] bg-[size:34px_34px]" />
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.55)_48%,transparent_50%)] bg-[size:220px_100%]" />
            <div className="absolute left-4 top-4 text-[8px] tracking-[0.24em] uppercase text-slate-500">Business activity monitor</div>
            <div className="absolute right-4 top-4 flex items-center gap-1.5 text-[8px] tracking-[0.16em] uppercase text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.9)]" /> Signal</div>

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="ecgBlue" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" /><stop offset="45%" stopColor="#7dd3fc" stopOpacity="1" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0.72" /></linearGradient>
                <linearGradient id="ecgRed" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fb7185" stopOpacity="0.28" /><stop offset="50%" stopColor="#fda4af" stopOpacity="0.92" /><stop offset="100%" stopColor="#fb7185" stopOpacity="0.48" /></linearGradient>
                <filter id="blueGlow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="redGlow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.1" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="lineDepth" x="-20%" y="-50%" width="140%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="1.4" floodOpacity="0.5" /></filter>
              </defs>
              <g stroke="#67e8f9" strokeOpacity="0.065" strokeWidth="0.22" vectorEffect="non-scaling-stroke">
                {[12,24,36,48,60,72,84].map((y) => <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} />)}
                {[5,15,25,35,45,55,65,75,85,95].map((x) => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="100" />)}
              </g>
              <path d={bookingEcgPath} fill="none" stroke="#0ea5e9" strokeOpacity="0.30" strokeWidth="2.8" vectorEffect="non-scaling-stroke" filter="url(#blueGlow)" />
              <path d={bookingEcgPath} fill="none" stroke="url(#ecgBlue)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#lineDepth)" />
              <path d={expenseEcgPath} fill="none" stroke="#fb7185" strokeOpacity="0.22" strokeWidth="2.5" vectorEffect="non-scaling-stroke" filter="url(#redGlow)" />
              <path d={expenseEcgPath} fill="none" stroke="url(#ecgRed)" strokeWidth="0.82" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {chartData.map((point, index) => {
                const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
                const y = 78 - (point.booking / maxBooking) * 50;
                return <g key={`${point.label}-${index}`}><circle cx={x} cy={y} r="1.8" fill="#07111f" stroke="#7dd3fc" strokeWidth="0.65" vectorEffect="non-scaling-stroke" /><circle cx={x} cy={y} r="0.55" fill="#e0f2fe" /></g>;
              })}
            </svg>

            <div className="absolute inset-x-3 bottom-2 flex justify-between text-[8px] text-slate-500 pointer-events-none">{chartData.filter((_, index) => chartData.length <= 8 || index % Math.ceil(chartData.length / 7) === 0).map((point, index) => <span key={`${point.label}-${index}`}>{point.label}</span>)}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-sky-50/70 border border-sky-100 p-2.5"><span className="block text-[8px] uppercase tracking-wider text-sky-500">Booking volume</span><span className="block text-sm font-semibold text-sky-700 mt-0.5">{chartData.reduce((sum, point) => sum + point.booking, 0)}</span></div><div className="rounded-xl bg-rose-50/70 border border-rose-100 p-2.5"><span className="block text-[8px] uppercase tracking-wider text-rose-500">Vendor expenses</span><span className="block text-sm font-semibold text-rose-600 mt-0.5">{money(chartData.reduce((sum, point) => sum + point.expense, 0))}</span></div></div>
        </div>

        <div className="xl:col-span-1 glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5"><div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Events Calendar</span><h2 className="text-lg sm:text-xl font-semibold text-[#0f172a] tracking-tight mt-1">{monthNames[month]} {year}</h2><p className="text-xs text-slate-500 mt-1">Confirmed events are dark. Completed events are marked red.</p></div><div className="flex items-center gap-1"><button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 rounded-xl bg-white/70 border border-white/70 text-slate-500" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 rounded-xl bg-white/70 border border-white/70 text-slate-500" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button></div></div>
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2 text-[10px] font-medium text-slate-400">{['Su','Mo','Tu','We','Th','Fr','Sa'].map((day) => <div key={day}>{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">{Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="py-2" />)}{Array.from({ length: days }).map((_, i) => { const d = i + 1; const db = getBookingsForDay(year, month, d); const has = db.length > 0; const completed = db.some((b) => String(b.bookingStatus).toLowerCase() === 'completed'); const today = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(); const cls = completed ? 'bg-red-500 text-white shadow-sm' : has ? 'bg-[#0f172a] text-white shadow-sm' : today ? 'border border-[#0f172a] text-[#0f172a] bg-white/40' : 'text-slate-700 hover:bg-white/45'; return <button key={d} onClick={() => db[0] && onSelectBooking(db[0])} className={`min-h-10 py-2 rounded-xl font-medium transition-colors ${cls}`} title={has ? `${db.length} booking${db.length === 1 ? '' : 's'}${completed ? ' • Completed' : ''}` : undefined}>{d}</button>; })}</div>
          <div className="mt-6 pt-4 border-t border-white/60 grid grid-cols-3 gap-3"><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Avg booking</span><span className="block text-sm font-medium text-[#0f172a] mt-1">{money(avg)}</span></div><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Confirmation</span><span className="block text-sm font-medium text-[#0f172a] mt-1">{rate}%</span></div><div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Completed</span><span className="block text-sm font-medium text-red-500 mt-1">{completedCount}</span></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 glass-panel p-6 sm:p-7"><div className="flex items-center justify-between mb-5"><div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Upcoming Schedule</span><h2 className="text-lg font-semibold text-[#0f172a] tracking-tight mt-1">Next Events</h2></div><button onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button></div>{upcomingEvents.length === 0 ? <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div> : <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">{upcomingEvents.map((b) => <button key={b.id} onClick={() => onSelectBooking(b)} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/45 backdrop-blur-xl border border-white/65 hover:bg-white/65"><div className="min-w-0"><p className="font-medium text-sm text-[#0f172a] truncate">{b.clientName}</p><p className="text-[11px] text-slate-500 mt-0.5 truncate">{b.eventType} • {normalizeDate(b.eventDate)}</p></div><div className="text-right shrink-0"><p className="font-medium text-xs text-[#0f172a]">{money(b.totalAmount)}</p><div className="mt-1"><StatusBadge status={b.bookingStatus} /></div></div></button>)}</div>}</div>
        <div className="xl:col-span-3 glass-panel p-6 sm:p-8"><div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-semibold text-[#0f172a]">Recent Client Bookings</h3><p className="text-xs text-slate-500 mt-0.5">Latest real reservations from the database</p></div><button onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">All Bookings <ArrowRight className="w-3.5 h-3.5" /></button></div>{recentBookings.length === 0 ? <div className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-medium border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{recentBookings.map((b) => <tr key={b.id} onClick={() => onSelectBooking(b)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 pr-3 font-medium text-xs">{b.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs">{b.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs">{normalizeDate(b.eventDate)}</td><td className="py-3.5 pr-3 text-right font-medium text-xs">{money(b.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={b.bookingStatus} /></td></tr>)}</tbody></table></div>}</div>
      </div>
    </div>
  );
};