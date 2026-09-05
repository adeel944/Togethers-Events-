import React, { useMemo, useState } from 'react';
import { Booking } from '../../types';

type Range = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type Point = { label: string; value: number; date?: string };

interface SalesGraphProps {
  bookings?: Booking[];
  currencySymbol?: string;
}

const BLUE = '#1685c0';
const GRID = '#dfe3e7';
const TEXT = '#667085';
const MAX_DAILY_POINTS = 365;

const dateOnly = (value: unknown) => {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const moneyLabel = (value: number, symbol: string) => `${symbol}${Math.round(value).toLocaleString()}`;

export const SalesGraph: React.FC<SalesGraphProps> = ({ bookings = [], currencySymbol = 'Rs. ' }) => {
  const [range, setRange] = useState<Range>('Daily');

  const points = useMemo<Point[]>(() => {
    const valid = bookings
      .filter((booking) => booking.bookingStatus !== 'Cancelled')
      .map((booking) => ({ date: dateOnly(booking.eventDate), value: Number(booking.totalAmount || 0) }))
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.value > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (range === 'Daily') {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      start.setDate(start.getDate() - (MAX_DAILY_POINTS - 1));
      const map = new Map<string, number>();
      valid.forEach((item) => map.set(item.date, (map.get(item.date) || 0) + item.value));
      return Array.from({ length: MAX_DAILY_POINTS }, (_, index) => {
        const d = new Date(start.getTime());
        d.setDate(start.getDate() + index);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { label: iso, value: map.get(iso) || 0, date: iso };
      });
    }

    if (range === 'Weekly') {
      const weeks: Point[] = [];
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      start.setDate(start.getDate() - (7 * 51));
      for (let i = 0; i < 52; i += 1) {
        const weekStart = new Date(start.getTime());
        weekStart.setDate(start.getDate() + i * 7);
        const weekEnd = new Date(weekStart.getTime());
        weekEnd.setDate(weekStart.getDate() + 6);
        const value = valid.reduce((sum, item) => {
          const d = new Date(`${item.date}T00:00:00`);
          return d >= weekStart && d <= weekEnd ? sum + item.value : sum;
        }, 0);
        weeks.push({ label: `W${i + 1}`, value });
      }
      return weeks;
    }

    if (range === 'Monthly') {
      const year = new Date().getFullYear();
      return Array.from({ length: 12 }, (_, month) => {
        const value = valid.reduce((sum, item) => {
          const d = new Date(`${item.date}T00:00:00`);
          return d.getFullYear() === year && d.getMonth() === month ? sum + item.value : sum;
        }, 0);
        return { label: new Date(year, month, 1).toLocaleString('en-US', { month: 'short' }), value };
      });
    }

    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => {
      const year = currentYear - 4 + index;
      const value = valid.reduce((sum, item) => {
        const d = new Date(`${item.date}T00:00:00`);
        return d.getFullYear() === year ? sum + item.value : sum;
      }, 0);
      return { label: String(year), value };
    });
  }, [bookings, range]);

  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const tickStep = maxValue / 5;
  const chartW = 1200;
  const chartH = 390;
  const plotLeft = 72;
  const plotRight = 18;
  const plotTop = 18;
  const plotBottom = 62;
  const plotW = chartW - plotLeft - plotRight;
  const plotH = chartH - plotTop - plotBottom;
  const xAt = (index: number) => points.length <= 1 ? plotLeft + plotW / 2 : plotLeft + (index / (points.length - 1)) * plotW;
  const yAt = (value: number) => plotTop + plotH - (value / maxValue) * plotH;
  const linePoints = points.map((point, index) => `${xAt(index)},${yAt(point.value)}`).join(' ');
  const labelStride = range === 'Daily' ? 14 : range === 'Weekly' ? 4 : 1;
  const visibleLabels = points.filter((_, index) => index % labelStride === 0 || index === points.length - 1);
  const yTicks = Array.from({ length: 6 }, (_, index) => index * tickStep).reverse();

  return (
    <div className="w-full bg-white border border-slate-200 rounded-[4px] px-4 sm:px-6 pt-5 pb-2 shadow-none">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-[20px] sm:text-[21px] font-normal text-slate-900 tracking-[-0.01em]">Sales Graph</h2>
        <div className="flex items-center gap-6 sm:gap-7 text-[18px] sm:text-[17px] leading-none shrink-0">
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as Range[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`relative pb-3 font-normal transition-colors ${range === item ? 'text-[#1685c0]' : 'text-[#1685c0]'}`}
            >
              {item}
              {range === item && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#1685c0] rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="block w-full h-[320px] sm:h-[370px]" preserveAspectRatio="none" role="img" aria-label="Sales graph">
          {yTicks.map((value, index) => {
            const y = yAt(value);
            return <g key={`y-${index}`}>
              <line x1={plotLeft} x2={chartW - plotRight} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={plotLeft - 12} y={y + 4} textAnchor="end" fontSize="11" fill={TEXT}>{moneyLabel(value, currencySymbol)}</text>
            </g>;
          })}

          {visibleLabels.map((point, visibleIndex) => {
            const originalIndex = points.indexOf(point);
            const x = xAt(originalIndex);
            return <g key={`x-${point.label}-${visibleIndex}`}>
              <line x1={x} x2={x} y1={plotTop} y2={plotTop + plotH} stroke={GRID} strokeWidth="1" />
              <text transform={`translate(${x - 2},${plotTop + plotH + 20}) rotate(-55)`} textAnchor="end" fontSize="10.5" fill={TEXT}>{point.label}</text>
            </g>;
          })}

          <polyline points={linePoints} fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <circle key={`${point.label}-${index}`} cx={xAt(index)} cy={yAt(point.value)} r="2.2" fill="#fff" stroke={BLUE} strokeWidth="1.4" />
          ))}

          {!bookings.some((booking) => booking.bookingStatus !== 'Cancelled' && Number(booking.totalAmount || 0) > 0) && (
            <text x={chartW / 2} y={plotTop + plotH / 2} textAnchor="middle" fontSize="13" fill={TEXT}>No sales recorded yet</text>
          )}
        </svg>
      </div>
    </div>
  );
};
