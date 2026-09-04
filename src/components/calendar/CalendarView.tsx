import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Booking, BusinessProfile } from '../../types';
import { initialBusinessProfile } from '../../services/mockData';

interface CalendarViewProps {
  bookings?: Booking[];
  profile?: BusinessProfile;
  onSelectBooking: (booking: Booking) => void;
  onNewBooking: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  bookings: inputBookings = [], profile: inputProfile, onSelectBooking, onNewBooking,
}) => {
  const profile = inputProfile || initialBusinessProfile;
  const bookings = Array.isArray(inputBookings) ? inputBookings : [];
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const normalizeEventDate = (value: unknown) => String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';
  const getBookingsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter((b) => normalizeEventDate(b.eventDate) === dateStr && b.bookingStatus !== 'Cancelled');
  };
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Events Calendar</h1>
          <p className="text-slate-500 text-sm mt-0.5">All events created through New Invoice appear here automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentDate(new Date())} className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs">Today</button>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button type="button" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-3 py-1 text-sm font-bold text-[#0f172a] min-w-[140px] text-center">{monthNames[month]} {year}</span>
            <button type="button" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button type="button" onClick={onNewBooking} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0f172a] text-white text-xs sm:text-sm font-semibold shadow-xl shadow-slate-200"><Plus className="w-4 h-4" />New Invoice</button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-white/40 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest py-3">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-transparent min-h-[560px]">
          {Array.from({ length: firstDayIndex }).map((_, idx) => <div key={`empty-${idx}`} className="bg-slate-50/30 p-2 min-h-[90px] sm:min-h-[110px]" />)}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayBookings = getBookingsForDate(dayNum);
            const isToday = isCurrentMonth && today.getDate() === dayNum;
            return (
              <div key={`day-${dayNum}`} className={`p-2 sm:p-2.5 min-h-[90px] sm:min-h-[110px] flex flex-col ${isToday ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>{dayNum}</span>
                  {dayBookings.length > 0 && <span className="text-[10px] font-semibold text-slate-400">{dayBookings.length} {dayBookings.length === 1 ? 'event' : 'events'}</span>}
                </div>
                <div className="space-y-1.5 mt-1.5 flex-1">
                  {dayBookings.map((b) => (
                    <div key={b.id} onClick={() => onSelectBooking(b)} className="p-1.5 rounded-lg bg-slate-900 text-white text-xs cursor-pointer hover:bg-slate-800 shadow-2xs">
                      <div className="font-semibold truncate text-[11px] leading-tight flex items-center justify-between"><span>{b.clientName}</span><span className="text-[9px] px-1 py-0.2 rounded bg-white/20 font-mono">{b.eventType}</span></div>
                      <div className="text-[10px] text-slate-300 truncate mt-0.5">{b.venue || 'Venue TBA'}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};