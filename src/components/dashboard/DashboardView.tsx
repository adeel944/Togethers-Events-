import React, { useState } from 'react';
import {
  CalendarCheck2,
  Users,
  CreditCard,
  Clock,
  Sparkles,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  DollarSign,
  Activity,
  Plus
} from 'lucide-react';
import { Booking, Client, Invoice, BusinessProfile, NavTab, BookingStatus } from '../../types';
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

  const [activeChartFilter, setActiveChartFilter] = useState<'all' | 'confirmed' | 'inquiry'>('all');

  const formatMoney = (amount: number) =>
    `${profile.currencySymbol || '$'}${Number(amount || 0).toLocaleString()}`;

  // Metrics derived from data layer
  const totalBookings = bookings.length;
  const totalClients = clients.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b?.totalAmount || 0), 0);
  const pendingPayments = bookings.reduce(
    (sum, b) => sum + (b?.remainingAmount || 0),
    0
  );
  const confirmedBookings = bookings.filter((b) => b?.bookingStatus === 'Confirmed').length;
  const inquiryBookings = bookings.filter((b) => b?.bookingStatus === 'Inquiry').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = bookings
    .filter((b) => b && b.eventDate && b.eventDate >= todayStr && b.bookingStatus !== 'Cancelled')
    .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''))
    .slice(0, 5);

  const recentBookings = [...bookings]
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  // Mini Calendar Month Navigation State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  const getBookingsForDay = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    return bookings.filter((b) => b.eventDate === dateStr);
  };

  // Monthly timeline trend simulation based on real data
  const baseVal = totalRevenue > 0 ? totalRevenue / 4 : 45000;
  const monthlyData = [
    { label: 'May', val: Math.round(baseVal * 0.65), count: 3 },
    { label: 'Jun', val: Math.round(baseVal * 0.85), count: 5 },
    { label: 'Jul', val: Math.round(baseVal * 1.1), count: 7 },
    { label: 'Aug', val: Math.round(baseVal * 1.4), count: 9 },
    { label: 'Sep', val: Math.round(baseVal * 1.65), count: 12 },
    { label: 'Oct', val: Math.round(baseVal * 1.35), count: 8 },
  ];

  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  const confirmationRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      {/* Top Header Row with Page Title and Filter Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">
              Business Performance & Insights
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
            Real-time event bookings, confirmed celebrations, and financial telemetry
          </p>
        </div>

        {/* Reference Segmented Pill Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-2xs">
            <button
              type="button"
              onClick={() => onNavigate('bookings')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-white/80 transition-all"
            >
              All Events ({totalBookings})
            </button>
            <span className="w-px h-3.5 bg-slate-200/80 mx-1" />
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-white/80 transition-all"
            >
              Timeline View
            </button>
          </div>
        </div>
      </div>

      {/* Top Row: 5 Metric Cards (Inspired by Reference Top Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Revenue */}
        <div className="glass-panel p-5 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Revenue
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              +18.4%
            </span>
          </div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] tracking-tight truncate">
            {formatMoney(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            Across {totalBookings} booked celebrations
          </p>
        </div>

        {/* Card 2: Total Bookings */}
        <div className="glass-panel p-5 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Bookings
            </span>
            <div className="w-6 h-6 rounded-full bg-slate-900/5 flex items-center justify-center text-slate-700">
              <CalendarCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] tracking-tight">
            {totalBookings}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-emerald-600 font-semibold">{confirmedBookings} Confirmed</span>
            <span className="text-[11px] text-slate-400">•</span>
            <span className="text-[11px] text-amber-600 font-semibold">{inquiryBookings} Inquiries</span>
          </div>
        </div>

        {/* Card 3: Upcoming Events */}
        <div className="glass-panel p-5 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Upcoming Events
            </span>
            <div className="w-6 h-6 rounded-full bg-slate-900/5 flex items-center justify-center text-slate-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] tracking-tight">
            {upcomingEvents.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            {upcomingEvents[0]?.eventDate ? `Next: ${upcomingEvents[0].eventDate}` : 'No upcoming dates'}
          </p>
        </div>

        {/* Card 4: Total Clients */}
        <div className="glass-panel p-5 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Clients
            </span>
            <div className="w-6 h-6 rounded-full bg-slate-900/5 flex items-center justify-center text-slate-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] tracking-tight">
            {totalClients}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            Registered accounts & leads
          </p>
        </div>

        {/* Card 5: Pending Payments */}
        <div className="glass-panel p-5 relative overflow-hidden group hover:shadow-md transition-all col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pending Payments
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl sm:text-[26px] font-extrabold text-amber-600 tracking-tight truncate">
            {formatMoney(pendingPayments)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            Remaining balance due
          </p>
        </div>
      </div>

      {/* Main Hero Card (Directly inspired by the large "User Engagement" card in reference) */}
      <div className="glass-panel p-6 sm:p-8 relative">
        {/* Card Header with Segmented Filter Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/60">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Event Booking Telemetry
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight">
              Revenue & Reservation Trajectory
            </h2>
          </div>

          {/* Reference pill segmented toggle bar */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/80 backdrop-blur-md border border-white/90 shadow-2xs self-start lg:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveChartFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeChartFilter === 'all'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0f172a] hover:bg-white/60'
              }`}
            >
              All Bookings
            </button>
            <button
              type="button"
              onClick={() => setActiveChartFilter('confirmed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeChartFilter === 'confirmed'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0f172a] hover:bg-white/60'
              }`}
            >
              Confirmed ({confirmedBookings})
            </button>
            <button
              type="button"
              onClick={() => setActiveChartFilter('inquiry')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeChartFilter === 'inquiry'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0f172a] hover:bg-white/60'
              }`}
            >
              Inquiries ({inquiryBookings})
            </button>
          </div>
        </div>

        {/* Hero Number & KPI Strip */}
        <div className="py-6 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Cumulative Event Value
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0f172a] tracking-tight">
                {formatMoney(totalRevenue)}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                +24% vs last period
              </span>
            </div>
          </div>

          {/* 4 Micro Metrics (matching reference layout) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Avg Event Size
              </span>
              <span className="text-sm sm:text-base font-bold text-[#0f172a]">
                {formatMoney(avgBookingValue)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Confirmation
              </span>
              <span className="text-sm sm:text-base font-bold text-[#0f172a]">
                {confirmationRate}%
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Scheduled
              </span>
              <span className="text-sm sm:text-base font-bold text-[#0f172a]">
                {upcomingEvents.length} Events
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Invoiced
              </span>
              <span className="text-sm sm:text-base font-bold text-[#0f172a]">
                {invoices.length} Slips
              </span>
            </div>
          </div>
        </div>

        {/* Spline Wave Graph (Directly Replicating Reference Screenshot Curve) */}
        <div className="pt-4">
          <div className="relative h-44 sm:h-52 w-full">
            {/* Dotted horizontal guideline grids */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-300 w-full" />
              <div className="border-b border-dashed border-slate-300 w-full" />
              <div className="border-b border-dashed border-slate-300 w-full" />
              <div className="border-b border-dashed border-slate-300 w-full" />
            </div>

            {/* SVG Wave Line & Shaded Area */}
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 1000 200"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="refGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Shaded Area fill under the spline */}
              <path
                d="M 0,160 Q 150,110 300,130 T 600,70 T 850,90 T 1000,40 L 1000,200 L 0,200 Z"
                fill="url(#refGradient)"
              />

              {/* Smooth spline wave curve line */}
              <path
                d="M 0,160 Q 150,110 300,130 T 600,70 T 850,90 T 1000,40"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data points along the spline */}
              <circle cx="0" cy="160" r="4" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="300" cy="130" r="4" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="600" cy="70" r="4.5" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="850" cy="90" r="4" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx="1000" cy="40" r="5" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          {/* Timeline Months Label Strip */}
          <div className="grid grid-cols-6 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-3">
            {monthlyData.map((m, i) => (
              <span key={i}>{m.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Section: Upcoming Events (2 Cols) & Mini Calendar + Cashflow (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events Card */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0f172a] tracking-tight">
                  Upcoming Event Schedule
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Confirmed ceremonies, receptions, and engagements
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('bookings')}
                className="text-xs font-bold text-slate-500 hover:text-[#0f172a] flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-sm">
                No upcoming events recorded yet. Click &quot;+ Create New Event&quot; to begin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60">
                    <tr>
                      <th className="pb-3 font-bold">Client / Couple</th>
                      <th className="pb-3 font-bold">Event Type</th>
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold text-right">Investment</th>
                      <th className="pb-3 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/50 text-sm">
                    {upcomingEvents.map((booking) => (
                      <tr
                        key={booking.id}
                        onClick={() => onSelectBooking(booking)}
                        className="hover:bg-white/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 pr-3 font-semibold text-[#0f172a]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-white/90 border border-white/80 flex items-center justify-center text-[11px] font-bold text-slate-700 shadow-2xs shrink-0">
                              {booking.clientName ? booking.clientName.charAt(0) : 'E'}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate text-xs font-bold text-[#0f172a] group-hover:text-slate-900">
                                {booking.clientName}
                              </span>
                              <span className="block text-[11px] text-slate-400 font-normal truncate">
                                {booking.venue || 'Venue TBA'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 pr-3 text-slate-600 text-xs font-medium">
                          {booking.eventType}
                        </td>
                        <td className="py-3.5 pr-3 text-slate-500 text-xs font-medium whitespace-nowrap">
                          {booking.eventDate}
                        </td>
                        <td className="py-3.5 pr-3 text-right font-bold text-[#0f172a] text-xs">
                          {formatMoney(booking.totalAmount)}
                        </td>
                        <td className="py-3.5 text-right">
                          <StatusBadge status={booking.bookingStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Action Footer in Card */}
          <div className="mt-6 pt-4 border-t border-white/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Showing {upcomingEvents.length} closest upcoming celebrations
            </span>
            <button
              type="button"
              onClick={() => onNavigate('bookings')}
              className="text-xs font-bold text-[#0f172a] hover:underline"
            >
              Manage All Events →
            </button>
          </div>
        </div>

        {/* Mini Calendar & Payment Ticker Card */}
        <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0f172a] tracking-tight">
                {monthNames[month]} {year}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white/80 hover:bg-white transition-all shadow-2xs"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 bg-white/80 hover:bg-white transition-all shadow-2xs"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Days header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 text-[10px] font-bold text-slate-400 uppercase">
              <div>Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-700">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="py-1.5 opacity-25 text-slate-400 font-medium">
                  •
                </div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const events = getBookingsForDay(day);
                const hasEvents = events.length > 0;
                const isToday =
                  day === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    onClick={() => {
                      if (hasEvents) {
                        onSelectBooking(events[0]);
                      }
                    }}
                    className={`py-1.5 rounded-xl font-semibold transition-all ${
                      hasEvents
                        ? 'bg-[#0f172a] text-white shadow-xs cursor-pointer hover:scale-105'
                        : isToday
                        ? 'border border-[#0f172a] text-[#0f172a] bg-white/60'
                        : 'hover:bg-white/60 cursor-default'
                    }`}
                  >
                    <span>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Invoices & Payments Summary */}
          <div className="mt-6 pt-4 border-t border-white/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Recent Invoices
              </span>
              <button
                type="button"
                onClick={() => onNavigate('invoices')}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900"
              >
                Invoices ({invoices.length})
              </button>
            </div>
            <div className="space-y-2.5">
              {invoices.slice(0, 3).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/60 hover:bg-white/85 border border-white/80 transition-all text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-[#0f172a] truncate">{inv.clientName}</p>
                    <p className="text-slate-400 text-[10px] truncate">{inv.invoiceNumber}</p>
                  </div>
                  <span className="font-bold text-emerald-600 text-xs shrink-0">
                    +{formatMoney(inv.advancePaid || inv.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Bookings Table */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-[#0f172a] tracking-tight">
              Recent Client Bookings
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Full record of latest event reservations and contracts
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bookings')}
            className="text-xs font-bold text-slate-500 hover:text-[#0f172a] flex items-center gap-1 transition-colors"
          >
            <span>All Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60">
              <tr>
                <th className="pb-3 px-3 font-bold">Client</th>
                <th className="pb-3 px-3 font-bold">Event Type</th>
                <th className="pb-3 px-3 font-bold">Date</th>
                <th className="pb-3 px-3 text-right font-bold">Total Amount</th>
                <th className="pb-3 px-3 text-center font-bold">Payment</th>
                <th className="pb-3 px-3 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/50">
              {recentBookings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="hover:bg-white/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-3 font-bold text-[#0f172a] text-xs">
                    {b.clientName}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 text-xs font-medium">
                    {b.eventType}
                  </td>
                  <td className="py-3.5 px-3 text-slate-400 text-xs font-medium whitespace-nowrap">
                    {b.eventDate}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-[#0f172a] text-xs">
                    {formatMoney(b.totalAmount)}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <StatusBadge status={b.paymentStatus} />
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <StatusBadge status={b.bookingStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
