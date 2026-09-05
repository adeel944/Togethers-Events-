import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Plus, TrendingUp, Wallet, ReceiptText } from 'lucide-react';
import { Booking, BusinessExpense, Client, Invoice, BusinessProfile, NavTab } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { initialBusinessProfile } from '../../services/mockData';
import { SalesGraph } from './SalesGraph';

interface DashboardViewProps {
  bookings?: Booking[];
  clients?: Client[];
  invoices?: Invoice[];
  profile?: BusinessProfile;
  onNavigate: (tab: NavTab) => void;
  onSelectBooking: (booking: Booking) => void;
}

const EXPENSE_KEY = 'together-events-business-expenses-v1';
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

  const money = (n: number) => `${profile.currencySymbol || 'Rs. '}${Number(n || 0).toLocaleString()}`;
  const normalizeDate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : raw;
  };

  const expenses = useMemo<BusinessExpense[]>(() => {
    try {
      const raw = localStorage.getItem(EXPENSE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const getInvoiceAmount = (invoice: Invoice) => {
    const stored = Number(invoice?.totalAmount || 0);
    if (stored > 0) return stored;
    if (invoice?.bookingId) {
      const booking = bookings.find((item) => item.id === invoice.bookingId);
      if (Number(booking?.totalAmount || 0) > 0) return Number(booking?.totalAmount || 0);
    }
    return (invoice?.items || []).reduce(
      (sum, item) => sum + Number(item?.total || Number(item?.quantity || 0) * Number(item?.unitPrice || 0)),
      0,
    );
  };

  const totalRevenue = invoices.reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
  const pendingPayments = invoices.reduce(
    (sum, invoice) => sum + Math.max(0, Number(invoice?.remainingBalance || 0) || getInvoiceAmount(invoice) - Number(invoice?.advancePaid || 0)),
    0,
  );
  const vendorPaidTotal = bookings.reduce(
    (sum, booking) => sum + (booking.assignedVendors || []).reduce((inner, vendor) => inner + Number(vendor.paidAmount || 0), 0),
    0,
  );
  const vendorCommitmentTotal = bookings.reduce(
    (sum, booking) => sum + (booking.assignedVendors || []).reduce((inner, vendor) => inner + Number(vendor.agreedAmount || 0), 0),
    0,
  );
  const otherExpenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const netProfit = totalRevenue - vendorPaidTotal - otherExpenseTotal;
  const confirmedBookings = bookings.filter((booking) => booking?.bookingStatus === 'Confirmed').length;
  const completedCount = bookings.filter((booking) => String(booking?.bookingStatus).toLowerCase() === 'completed').length;
  const todayStr = normalizeDate(new Date().toISOString());

  const upcomingEvents = useMemo(
    () => [...bookings]
      .filter((booking) => {
        const date = normalizeDate(booking?.eventDate);
        return date && date >= todayStr && booking?.bookingStatus !== 'Cancelled';
      })
      .sort((a, b) => normalizeDate(a.eventDate).localeCompare(normalizeDate(b.eventDate))),
    [bookings, todayStr],
  );

  const recentBookings = useMemo(
    () => [...bookings].filter(Boolean).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5),
    [bookings],
  );

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const getBookingsForDay = (y: number, m: number, d: number) => {
    const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return bookings.filter((booking) => normalizeDate(booking.eventDate) === date && booking.bookingStatus !== 'Cancelled');
  };

  const calendarMonthBookings = useMemo(
    () => bookings.filter((booking) => {
      const date = normalizeDate(booking.eventDate);
      return date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`) && booking.bookingStatus !== 'Cancelled';
    }),
    [bookings, year, month],
  );
  const calendarMonthCompleteEvents = calendarMonthBookings.filter((booking) => String(booking.bookingStatus).toLowerCase() === 'completed').length;
  const calendarMonthRemainingEvents = calendarMonthBookings.length - calendarMonthCompleteEvents;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0f172a]">Business Performance &amp; Insights</h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-normal mt-1">Revenue, vendor payments, expenses and profit in one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3.5 py-2.5 rounded-2xl bg-[#0f172a] text-white text-xs font-medium">
            <Plus className="w-3.5 h-3.5 inline mr-1" />New Invoice
          </button>
          <button type="button" onClick={() => onNavigate('finance')} className="px-3.5 py-2.5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 text-slate-700 text-xs font-medium">Profit &amp; Loss</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Revenue</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3 truncate">{money(totalRevenue)}</div><p className="text-[11px] text-slate-500 mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p></div>
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Bookings</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{bookings.length}</div><div className="text-[11px] mt-1"><strong>{confirmedBookings}</strong> confirmed · <strong>{completedCount}</strong> completed</div></div>
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Upcoming Events</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{upcomingEvents.length}</div><p className="text-[11px] text-slate-500 mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${normalizeDate(upcomingEvents[0].eventDate)}` : 'No upcoming dates'}</p></div>
        <div className="glass-panel p-5"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Total Clients</span><div className="text-2xl sm:text-[26px] font-medium text-[#0f172a] mt-3">{clients.length}</div><p className="text-[11px] text-slate-500 mt-1">Registered accounts &amp; leads</p></div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1"><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Pending Payments</span><div className="text-2xl sm:text-[26px] font-medium text-amber-600 mt-3 truncate">{money(pendingPayments)}</div><p className="text-[11px] text-slate-500 mt-1">Remaining invoice balance</p></div>
      </div>

      <SalesGraph bookings={bookings} expenses={expenses} currencySymbol={profile.currencySymbol || 'Rs. '} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Events Calendar</span>
              <h2 className="text-lg sm:text-xl font-semibold text-[#0f172a] tracking-tight mt-1">{monthNames[month]} {year}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 rounded-xl bg-white/70 border border-white/70 text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
              <button type="button" onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 rounded-xl bg-white/70 border border-white/70 text-slate-500"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2 text-[10px] font-medium text-slate-400">{['Su','Mo','Tu','We','Th','Fr','Sa'].map((day) => <div key={day}>{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="py-2" />)}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1;
              const dayBookings = getBookingsForDay(year, month, d);
              const completed = dayBookings.some((booking) => String(booking.bookingStatus).toLowerCase() === 'completed');
              const today = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const cls = completed ? 'bg-red-500 text-white' : dayBookings.length ? 'bg-[#0f172a] text-white' : today ? 'border border-[#0f172a] text-[#0f172a] bg-white/40' : 'text-slate-700 hover:bg-white/45';
              return <button type="button" key={d} onClick={() => dayBookings[0] && onSelectBooking(dayBookings[0])} className={`min-h-10 py-2 rounded-xl font-medium ${cls}`}>{d}</button>;
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-white/60 grid grid-cols-3 gap-3">
            <div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Total Booking</span><span className="block text-sm font-medium mt-1">{calendarMonthBookings.length}</span></div>
            <div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Complete Event</span><span className="block text-sm font-medium mt-1">{calendarMonthCompleteEvents}</span></div>
            <div className="glass-card-subtle p-3"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Remaining Event</span><span className="block text-sm font-medium text-amber-700 mt-1">{calendarMonthRemainingEvents}</span></div>
          </div>
        </div>

        <div className="xl:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Upcoming Schedule</span><h2 className="text-lg font-semibold text-[#0f172a] mt-1">Next Events</h2></div>
            <button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          {upcomingEvents.length === 0 ? <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div> : <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">{upcomingEvents.map((booking) => <button type="button" key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/45 border border-white/65"><div className="min-w-0"><p className="font-medium text-sm text-[#0f172a] truncate">{booking.clientName}</p><p className="text-[11px] text-slate-500 mt-0.5 truncate">{booking.eventType} • {normalizeDate(booking.eventDate)}</p></div><div className="text-right shrink-0"><p className="font-medium text-xs text-[#0f172a]">{money(booking.totalAmount)}</p><div className="mt-1"><StatusBadge status={booking.bookingStatus} /></div></div></button>)}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5"><div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Recent Activity</span><h2 className="text-lg font-semibold text-[#0f172a] mt-1">Recent Client Bookings</h2></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-medium text-slate-500 flex items-center gap-1">All Bookings <ArrowRight className="w-3.5 h-3.5" /></button></div>
          {recentBookings.length === 0 ? <div className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</div> : <div className="space-y-2.5">{recentBookings.map((booking) => <button type="button" key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/45 border border-white/65"><div className="min-w-0"><p className="font-medium text-sm text-[#0f172a] truncate">{booking.clientName}</p><p className="text-[11px] text-slate-500 mt-0.5 truncate">{booking.eventType} • {normalizeDate(booking.eventDate)}</p></div><div className="text-right shrink-0"><p className="font-medium text-xs text-[#0f172a]">{money(booking.totalAmount)}</p><div className="mt-1"><StatusBadge status={booking.bookingStatus} /></div></div></button>)}</div>}
        </div>

        <div className="xl:col-span-3 glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between mb-5">
            <div><span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">Financial Snapshot</span><h2 className="text-lg font-semibold text-[#0f172a] mt-1">Current position</h2></div>
            <button type="button" onClick={() => onNavigate('finance')} className="text-xs font-medium text-slate-500 flex items-center gap-1">Open P&amp;L <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card-subtle p-4"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Revenue</span><span className="block text-sm font-medium text-[#0f172a] mt-2 truncate">{money(totalRevenue)}</span></div>
            <div className="glass-card-subtle p-4"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Vendor Paid</span><span className="block text-sm font-medium text-slate-700 mt-2 truncate">{money(vendorPaidTotal)}</span><span className="block text-[10px] text-slate-400 mt-1">Commitment {money(vendorCommitmentTotal)}</span></div>
            <div className="glass-card-subtle p-4"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Other Expenses</span><span className="block text-sm font-medium text-amber-700 mt-2 truncate">{money(otherExpenseTotal)}</span></div>
            <div className="glass-card-subtle p-4"><span className="block text-[9px] uppercase tracking-widest text-slate-400">Net Profit</span><span className={`block text-sm font-medium mt-2 truncate ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(netProfit)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
