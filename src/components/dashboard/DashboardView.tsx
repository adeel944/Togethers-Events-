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

  const money = (n: number) =>
    `${profile.currencySymbol || 'Rs. '}${Number(n || 0).toLocaleString()}`;

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
      if (Number(booking?.totalAmount || 0) > 0) {
        return Number(booking?.totalAmount || 0);
      }
    }

    const itemTotal = (invoice?.items || []).reduce(
      (sum, item) =>
        sum +
        Number(
          item?.total ||
            Number(item?.quantity || 0) * Number(item?.unitPrice || 0),
        ),
      0,
    );
    const subtotal = Number(invoice?.subtotal || 0);

    return Math.max(
      0,
      subtotal > 0
        ? subtotal -
            Number(invoice?.discount || 0) +
            Number(invoice?.tax || 0)
        : itemTotal,
    );
  };

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + getInvoiceAmount(invoice),
    0,
  );

  const pendingPayments = invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(
        0,
        Number(invoice?.remainingBalance || 0) ||
          getInvoiceAmount(invoice) - Number(invoice?.advancePaid || 0),
      ),
    0,
  );

  const confirmedBookings = bookings.filter(
    (booking) => booking?.bookingStatus === 'Confirmed',
  ).length;

  const completedCount = bookings.filter(
    (booking) => String(booking.bookingStatus).toLowerCase() === 'completed',
  ).length;

  const todayStr = normalizeDate(new Date().toISOString());

  const upcomingEvents = [...bookings]
    .filter((booking) => {
      const date = normalizeDate(booking?.eventDate);
      return (
        date &&
        date >= todayStr &&
        booking?.bookingStatus !== 'Cancelled'
      );
    })
    .sort((a, b) =>
      normalizeDate(a.eventDate).localeCompare(normalizeDate(b.eventDate)),
    );

  const recentBookings = [...bookings]
    .filter(Boolean)
    .sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || ''),
    )
    .slice(0, 5);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const getBookingsForDay = (y: number, m: number, d: number) => {
    const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return bookings.filter(
      (booking) =>
        normalizeDate(booking.eventDate) === date &&
        booking.bookingStatus !== 'Cancelled',
    );
  };

  const chartData = useMemo(() => {
    const selectedYear = chartMonth.getFullYear();
    const selectedMonth = chartMonth.getMonth();
    const start = new Date(selectedYear, selectedMonth, 1);
    const count =
      range === 'month'
        ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
        : range === '3months'
          ? 3
          : 12;

    const points: Array<{ label: string; booking: number; expense: number }> = [];

    const expenseForDate = (y: number, m: number, d: number) =>
      bookings
        .filter(
          (b) =>
            normalizeDate(b.eventDate) ===
            `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        )
        .reduce(
          (sum, b) =>
            sum +
            (b.assignedVendors || []).reduce(
              (vendorSum, vendor) =>
                vendorSum + Number(vendor.paidAmount || 0),
              0,
            ),
          0,
        );

    if (range === 'month') {
      for (let day = 1; day <= count; day += 1) {
        points.push({
          label: String(day),
          booking: getBookingsForDay(selectedYear, selectedMonth, day).length,
          expense: expenseForDate(selectedYear, selectedMonth, day),
        });
      }
    } else {
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(start.getFullYear(), start.getMonth() - index, 1);
        let booking = 0;
        let expense = 0;
        const daysInMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();

        for (let day = 1; day <= daysInMonth; day += 1) {
          booking += getBookingsForDay(
            date.getFullYear(),
            date.getMonth(),
            day,
          ).length;
          expense += expenseForDate(
            date.getFullYear(),
            date.getMonth(),
            day,
          );
        }

        points.push({
          label: monthNames[date.getMonth()].slice(0, 3),
          booking,
          expense,
        });
      }
    }

    return points;
  }, [bookings, chartMonth, range]);

  const maxBooking = Math.max(1, ...chartData.map((point) => point.booking));
  const maxExpense = Math.max(1, ...chartData.map((point) => point.expense));

  const chartTitle =
    range === 'month'
      ? `${monthNames[chartMonth.getMonth()]} ${chartMonth.getFullYear()}`
      : range === '3months'
        ? 'Last 3 Months'
        : 'Last 12 Months';

  const avg = bookings.length
    ? Math.round(
        bookings.reduce(
          (sum, booking) => sum + Number(booking.totalAmount || 0),
          0,
        ) / bookings.length,
      )
    : 0;

  const rate = bookings.length
    ? Math.round((confirmedBookings / bookings.length) * 100)
    : 0;

  const smoothSeries = (key: 'booking' | 'expense') =>
    chartData.map((point, index) => {
      const prev = chartData[index - 1]?.[key] ?? point[key];
      const next = chartData[index + 1]?.[key] ?? point[key];
      return (prev + point[key] + next) / 3;
    });

  const smoothPath = (key: 'booking' | 'expense') => {
    if (!chartData.length) return '';

    const values = smoothSeries(key);
    const max = key === 'booking' ? maxBooking : maxExpense;
    const points = values.map((value, index) => ({
      x: chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100,
      y: 88 - (value / max) * 62,
    }));

    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` Q ${last.x} ${last.y}, ${last.x} ${last.y}`;
    return path;
  };

  const bookingPath = smoothPath('booking');
  const expensePath = smoothPath('expense');
  const bookingSmooth = smoothSeries('booking');
  const expenseSmooth = smoothSeries('expense');

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a]">
              Business Performance &amp; Insights
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">
            A clear view of your bookings, revenue and upcoming events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('invoices')}
            className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />New Invoice
          </button>
          <button
            onClick={() => onNavigate('invoices')}
            className="px-3.5 py-2.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 text-slate-700 text-xs font-medium"
          >
            Invoices ({invoices.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Revenue</span>
          <div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3 truncate">{money(totalRevenue)}</div>
          <p className="text-[11px] text-slate-500 mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p>
        </div>
        <div className="glass-panel p-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Bookings</span>
          <div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{bookings.length}</div>
          <div className="flex items-center gap-3 mt-1 text-[11px]">
            <span><strong className="text-[#0f172a]">{confirmedBookings}</strong> Bookings Confirm</span>
            <span><strong className="text-red-500">{completedCount}</strong> Event Done</span>
          </div>
        </div>
        <div className="glass-panel p-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Upcoming Events</span>
          <div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{upcomingEvents.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${normalizeDate(upcomingEvents[0].eventDate)}` : 'No upcoming dates'}</p>
        </div>
        <div className="glass-panel p-5">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Clients</span>
          <div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{clients.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Registered accounts &amp; leads</p>
        </div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Pending Payments</span>
          <div className="text-2xl sm:text-[26px] font-medium text-amber-600 mt-3 truncate">{money(pendingPayments)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Remaining invoice balance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Financial Activity</span>
              <h2 className="text-lg sm:text-xl font-semibold text-[#0f172a] tracking-tight mt-1">{chartTitle}</h2>
            </div>
            <div className="flex rounded-xl bg-white/55 backdrop-blur-xl border border-white/80 p-1">
              {(['month', '3months', 'year'] as Range[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-medium ${range === item ? 'bg-[#0f172a] text-white' : 'text-slate-500 hover:bg-white/70'}`}
                >
                  {item === 'month' ? 'Month' : item === '3months' ? '3M' : '1Y'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-2 text-[9px] font-medium">
            <span className="flex items-center gap-1.5 text-blue-600"><i className="w-1.5 h-1.5 rounded-full bg-blue-600" />Bookings</span>
            <span className="flex items-center gap-1.5 text-red-500"><i className="w-1.5 h-1.5 rounded-full bg-red-500" />Expenses</span>
          </div>

          <div className="flex items-center justify-end gap-1 -mt-5 mb-2">
            <button
              onClick={() => setChartMonth(new Date(chartMonth.getFullYear(), chartMonth.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg bg-white/60 border border-white/80 text-slate-500"
              aria-label="Previous chart month"
            ><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button
              onClick={() => setChartMonth(new Date(chartMonth.getFullYear(), chartMonth.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg bg-white/60 border border-white/80 text-slate-500"
              aria-label="Next chart month"
            ><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>

          <div className="h-[330px] relative overflow-hidden rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/45">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" aria-label="Financial activity line chart">
              <g stroke="#64748b" strokeOpacity="0.09" strokeWidth="0.22" strokeDasharray="1.5 2.5" vectorEffect="non-scaling-stroke">
                {[16, 32, 48, 64, 80].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} />)}
                {[5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((x) => <line key={`v${x}`} x1={x} y1="8" x2={x} y2="92" />)}
              </g>
              <path d={bookingPath} fill="none" stroke="#3b82f6" strokeWidth="1.05" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {chartData.map((point, index) => {
                const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
                const bookingY = 88 - (bookingSmooth[index] / maxBooking) * 62;
                const expenseY = 88 - (expenseSmooth[index] / maxExpense) * 62;
                return (
                  <g key={`${point.label}-${index}`}>
                    <circle cx={x} cy={bookingY} r="0.42" fill="#3b82f6" vectorEffect="non-scaling-stroke" />
                    <circle cx={x} cy={expenseY} r="0.42" fill="#ef4444" vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </svg>
            <div className="absolute inset-x-2 bottom-1 flex justify-between text-[8px] text-slate-400 pointer-events-none">
              {chartData.filter((_, index) => chartData.length <= 8 || index % Math.ceil(chartData.length / 6) === 0).map((point, index) => (
                <span key={`${point.label}-${index}`}>{point.label}</span>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-2.5">
              <span className="block text-[8px] uppercase tracking-wider text-blue-500">Booking volume</span>
              <span className="block text-sm font-semibold text-blue-700 mt-0.5">{chartData.reduce((sum, point) => sum + point.booking, 0)}</span>
            </div>
            <div className="rounded-xl bg-red-50/70 border border-red-100 p-2.5">
              <span className="block text-[8px] uppercase tracking-wider text-red-500">Vendor expenses</span>
              <span className="block text-sm font-semibold text-red-600 mt-0.5">{money(chartData.reduce((sum, point) => sum + point.expense, 0))}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Events Calendar</span>
              <h2 className="text-lg sm:text-xl font-semibold text-[#0f172a] tracking-tight mt-1">{monthNames[month]} {year}</h2>
              <p className="text-xs text-slate-500 mt-1">Confirmed events are dark. Completed events are marked red.</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 rounded-xl bg-white/70 border border-white/70 text-slate-500" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 rounded-xl bg-white/70 border border-white/70 text-slate-500" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center mb-2 text-[10px] font-medium text-slate-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <div key={day}>{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {Array.from({ length: firstDay }).map((_, index) => <div key={`e${index}`} className="py-2" />)}
            {Array.from({ length: days }).map((_, index) => {
              const day = index + 1;
              const dayBookings = getBookingsForDay(year, month, day);
              const hasBookings = dayBookings.length > 0;
              const completed = dayBookings.some((booking) => String(booking.bookingStatus).toLowerCase() === 'completed');
              const today = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const className = completed
                ? 'bg-red-500 text-white shadow-sm'
                : hasBookings
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : today
                    ? 'border border-[#0f172a] text-[#0f172a] bg-white/40'
                    : 'text-slate-700 hover:bg-white/45';
              return (
                <button
                  key={day}
                  onClick={() => dayBookings[0] && onSelectBooking(dayBookings[0])}
                  className={`min-h-10 py-2 rounded-xl font-medium transition-colors ${className}`}
                  title={hasBookings ? `${dayBookings.length} booking${dayBookings.length === 1 ? '' : 's'}${completed ? ' • Completed' : ''}` : undefined}
                >{day}</button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-white/60 grid grid-cols-3 gap-3">
            <div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Avg booking</span><span className="block text-sm font-medium text-[#0f172a] mt-1">{money(avg)}</span></div>
            <div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Confirmation</span><span className="block text-sm font-medium text-[#0f172a] mt-1">{rate}%</span></div>
            <div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest font-medium text-slate-400">Completed</span><span className="block text-sm font-medium text-red-500 mt-1">{completedCount}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Upcoming Schedule</span><h2 className="text-lg font-semibold text-[#0f172a] tracking-tight mt-1">Next Events</h2></div>
            <button onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div>
          ) : (
            <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">
              {upcomingEvents.map((booking) => (
                <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/45 backdrop-blur-xl border border-white/65 hover:bg-white/65">
                  <div className="min-w-0"><p className="font-medium text-sm text-[#0f172a] truncate">{booking.clientName}</p><p className="text-[11px] text-slate-500 mt-0.5 truncate">{booking.eventType} • {normalizeDate(booking.eventDate)}</p></div>
                  <div className="text-right shrink-0"><p className="font-medium text-xs text-[#0f172a]">{money(booking.totalAmount)}</p><div className="mt-1"><StatusBadge status={booking.bookingStatus} /></div></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-3 glass-panel p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div><h3 className="text-base font-semibold text-[#0f172a]">Recent Client Bookings</h3><p className="text-xs text-slate-500 mt-0.5">Latest real reservations from the database</p></div>
            <button onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">All Bookings <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase tracking-widest text-slate-400 font-medium border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead>
                <tbody className="divide-y divide-white/50">
                  {recentBookings.map((booking) => (
                    <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer">
                      <td className="py-3.5 pr-3 font-medium text-xs">{booking.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs">{booking.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs">{normalizeDate(booking.eventDate)}</td><td className="py-3.5 pr-3 text-right font-medium text-xs">{money(booking.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={booking.bookingStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
