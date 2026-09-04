import React, { useMemo } from 'react';
import { CalendarCheck2, Users, Clock, ArrowRight, Plus } from 'lucide-react';
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

  const formatMoney = (amount: number) => `${profile.currencySymbol || '$'}${Number(amount || 0).toLocaleString()}`;
  const normalizeDate = (value: unknown) => {
    const match = String(value ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  };

  // The invoice is the financial source of truth. The fallback only protects
  // older rows whose generated DB total is zero by calculating from line items.
  const getInvoiceAmount = (invoice: Invoice) => {
    const stored = Number(invoice?.totalAmount || 0);
    if (stored > 0) return stored;
    const itemTotal = (invoice?.items || []).reduce(
      (sum, item) => sum + Number(item?.total || (Number(item?.quantity || 0) * Number(item?.unitPrice || 0))),
      0,
    );
    const subtotal = Number(invoice?.subtotal || itemTotal || 0);
    return Math.max(0, subtotal - Number(invoice?.discount || 0) + Number(invoice?.tax || 0));
  };

  const totalRevenue = invoices.reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
  const pendingPayments = invoices.reduce((sum, invoice) => Math.max(0, sum + getInvoiceAmount(invoice) - Number(invoice?.advancePaid || 0)), 0);
  const confirmedBookings = bookings.filter((b) => b?.bookingStatus === 'Confirmed').length;
  const inquiryBookings = bookings.filter((b) => b?.bookingStatus === 'Inquiry').length;
  const today = normalizeDate(new Date().toISOString());
  const upcomingEvents = useMemo(() => [...bookings]
    .filter((b) => normalizeDate(b?.eventDate) >= today && b?.bookingStatus !== 'Cancelled')
    .sort((a, b) => normalizeDate(a.eventDate).localeCompare(normalizeDate(b.eventDate)))
    .slice(0, 5), [bookings, today]);

  const avgBookingValue = bookings.length
    ? Math.round(bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0) / bookings.length)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-900" /><h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">Business Performance &amp; Insights</h1></div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">Live data from your invoices, bookings and clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3 py-2 rounded-xl bg-[#0f172a] text-white text-xs font-bold hover:opacity-90"><span className="inline-flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Invoice</span></button>
          <button type="button" onClick={() => onNavigate('invoices')} className="px-3 py-2 rounded-xl bg-white/80 border border-white/90 text-slate-700 text-xs font-bold hover:bg-white">Invoices ({invoices.length})</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</span><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3 truncate">{formatMoney(totalRevenue)}</div><p className="text-[11px] text-slate-500 font-medium mt-1">From {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</span><CalendarCheck2 className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{bookings.length}</div><div className="flex items-center gap-2 mt-1"><span className="text-[11px] text-emerald-600 font-semibold">{confirmedBookings} Confirmed</span><span className="text-[11px] text-slate-400">•</span><span className="text-[11px] text-amber-600 font-semibold">{inquiryBookings} Inquiries</span></div></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upcoming Events</span><Clock className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{upcomingEvents.length}</div><p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{upcomingEvents[0]?.eventDate ? `Next: ${normalizeDate(upcomingEvents[0].eventDate)}` : 'No upcoming dates'}</p></div>
        <div className="glass-panel p-5"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Clients</span><Users className="w-4 h-4 text-slate-500" /></div><div className="text-2xl sm:text-[26px] font-extrabold text-[#0f172a] mt-3">{clients.length}</div><p className="text-[11px] text-slate-500 font-medium mt-1">Registered accounts &amp; leads</p></div>
        <div className="glass-panel p-5 col-span-2 md:col-span-1"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Payments</span><div className="text-2xl sm:text-[26px] font-extrabold text-amber-600 mt-3 truncate">{formatMoney(pendingPayments)}</div><p className="text-[11px] text-slate-500 font-medium mt-1">Remaining invoice balance</p></div>
      </div>

      <div className="glass-panel p-6 sm:p-7">
        <div className="flex items-center justify-between mb-5"><div><h3 className="text-base font-bold text-[#0f172a]">Upcoming Event Schedule</h3><p className="text-xs text-slate-500 font-medium mt-0.5">Events created automatically from New Invoice</p></div><button type="button" onClick={() => onNavigate('bookings')} className="text-xs font-bold text-slate-500 hover:text-[#0f172a] flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></button></div>
        {upcomingEvents.length === 0 ? <div className="py-14 text-center text-slate-400 text-sm">No upcoming events recorded yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-white/60"><tr><th className="pb-3">Client</th><th className="pb-3">Event</th><th className="pb-3">Date</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Status</th></tr></thead><tbody className="divide-y divide-white/50">{upcomingEvents.map((booking) => <tr key={booking.id} onClick={() => onSelectBooking(booking)} className="hover:bg-white/40 cursor-pointer"><td className="py-3.5 pr-3 font-bold text-xs">{booking.clientName}</td><td className="py-3.5 pr-3 text-slate-600 text-xs">{booking.eventType}</td><td className="py-3.5 pr-3 text-slate-500 text-xs">{normalizeDate(booking.eventDate)}</td><td className="py-3.5 pr-3 text-right font-bold text-xs">{formatMoney(booking.totalAmount)}</td><td className="py-3.5 text-right"><StatusBadge status={booking.bookingStatus} /></td></tr>)}</tbody></table></div>}
      </div>

      <div className="glass-panel p-6 sm:p-7"><div className="grid grid-cols-2 sm:grid-cols-3 gap-4"><div><span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Booking</span><div className="text-sm font-bold mt-1">{formatMoney(avgBookingValue)}</div></div><div><span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Invoiced</span><div className="text-sm font-bold mt-1">{invoices.length}</div></div><div><span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Workflow</span><div className="text-sm font-bold mt-1">Invoice → Booking</div></div></div></div>
    </div>
  );
};
