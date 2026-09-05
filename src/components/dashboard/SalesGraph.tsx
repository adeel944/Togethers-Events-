import React, { useMemo, useState } from 'react';
import { Booking, BusinessExpense } from '../../types';

type Range = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
type Point = { label: string; revenue: number; vendor: number; expense: number; profit: number; date?: string };

interface SalesGraphProps {
  bookings?: Booking[];
  expenses?: BusinessExpense[];
  currencySymbol?: string;
}

const COLORS = {
  revenue: '#0f172a',
  vendor: '#64748b',
  expense: '#d97706',
  profit: '#15803d',
  grid: 'rgba(148, 163, 184, 0.22)',
  text: '#64748b',
};
const MAX_DAILY_POINTS = 365;

const dateOnly = (value: unknown) => {
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const moneyLabel = (value: number, symbol: string) => `${value < 0 ? '-' : ''}${symbol}${Math.round(Math.abs(value)).toLocaleString()}`;

const smoothPath = (points: Array<{ x: number; y: number }>) => {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const midpoint = (previous.x + current.x) / 2;
    path += ` C ${midpoint},${previous.y} ${midpoint},${current.y} ${current.x},${current.y}`;
  }
  return path;
};

export const SalesGraph: React.FC<SalesGraphProps> = ({ bookings = [], expenses = [], currencySymbol = 'Rs. ' }) => {
  const [range, setRange] = useState<Range>('Daily');

  const normalized = useMemo(() => {
    const revenue = bookings
      .filter((booking) => booking.bookingStatus !== 'Cancelled')
      .map((booking) => ({ date: dateOnly(booking.eventDate), value: Number(booking.totalAmount || 0) }))
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.value > 0);

    const vendor = bookings.flatMap((booking) =>
      (booking.assignedVendors || [])
        .filter((item) => Number(item.paidAmount || 0) > 0)
        .map((item) => ({
          date: dateOnly(item.paymentDate || booking.eventDate),
          value: Number(item.paidAmount || 0),
        })),
    ).filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.value > 0);

    const otherExpenses = expenses
      .map((expense) => ({ date: dateOnly(expense.date), value: Number(expense.amount || 0) }))
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.value > 0);

    return { revenue, vendor, expense: otherExpenses };
  }, [bookings, expenses]);

  const points = useMemo<Point[]>(() => {
    const sumByDate = (items: Array<{ date: string; value: number }>) => {
      const map = new Map<string, number>();
      items.forEach((item) => map.set(item.date, (map.get(item.date) || 0) + item.value));
      return map;
    };

    const revenueMap = sumByDate(normalized.revenue);
    const vendorMap = sumByDate(normalized.vendor);
    const expenseMap = sumByDate(normalized.expense);

    const buildPoint = (label: string, revenue: number, vendor: number, expense: number, date?: string): Point => ({
      label,
      revenue,
      vendor,
      expense,
      profit: revenue - vendor - expense,
      date,
    });

    if (range === 'Daily') {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      start.setDate(start.getDate() - (MAX_DAILY_POINTS - 1));
      return Array.from({ length: MAX_DAILY_POINTS }, (_, index) => {
        const d = new Date(start.getTime());
        d.setDate(start.getDate() + index);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return buildPoint(iso, revenueMap.get(iso) || 0, vendorMap.get(iso) || 0, expenseMap.get(iso) || 0, iso);
      });
    }

    const allDates = [
      ...normalized.revenue.map((item) => item.date),
      ...normalized.vendor.map((item) => item.date),
      ...normalized.expense.map((item) => item.date),
    ].sort();

    if (range === 'Weekly') {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      start.setDate(start.getDate() - (7 * 51));
      return Array.from({ length: 52 }, (_, index) => {
        const weekStart = new Date(start.getTime());
        weekStart.setDate(start.getDate() + index * 7);
        const weekEnd = new Date(weekStart.getTime());
        weekEnd.setDate(weekStart.getDate() + 6);
        const inWeek = (date: string) => {
          const d = new Date(`${date}T00:00:00`);
          return d >= weekStart && d <= weekEnd;
        };
        const revenue = normalized.revenue.filter((item) => inWeek(item.date)).reduce((sum, item) => sum + item.value, 0);
        const vendor = normalized.vendor.filter((item) => inWeek(item.date)).reduce((sum, item) => sum + item.value, 0);
        const expense = normalized.expense.filter((item) => inWeek(item.date)).reduce((sum, item) => sum + item.value, 0);
        return buildPoint(`W${index + 1}`, revenue, vendor, expense);
      });
    }

    if (range === 'Monthly') {
      const year = new Date().getFullYear();
      return Array.from({ length: 12 }, (_, month) => {
        const inMonth = (date: string) => {
          const d = new Date(`${date}T00:00:00`);
          return d.getFullYear() === year && d.getMonth() === month;
        };
        const revenue = normalized.revenue.filter((item) => inMonth(item.date)).reduce((sum, item) => sum + item.value, 0);
        const vendor = normalized.vendor.filter((item) => inMonth(item.date)).reduce((sum, item) => sum + item.value, 0);
        const expense = normalized.expense.filter((item) => inMonth(item.date)).reduce((sum, item) => sum + item.value, 0);
        return buildPoint(new Date(year, month, 1).toLocaleString('en-US', { month: 'short' }), revenue, vendor, expense);
      });
    }

    const years = new Set<number>();
    allDates.forEach((date) => years.add(Number(date.slice(0, 4))));
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 4 + index).map((year) => {
      const inYear = (date: string) => Number(date.slice(0, 4)) === year;
      const revenue = normalized.revenue.filter((item) => inYear(item.date)).reduce((sum, item) => sum + item.value, 0);
      const vendor = normalized.vendor.filter((item) => inYear(item.date)).reduce((sum, item) => sum + item.value, 0);
      const expense = normalized.expense.filter((item) => inYear(item.date)).reduce((sum, item) => sum + item.value, 0);
      return buildPoint(String(year), revenue, vendor, expense);
    });
  }, [normalized, range]);

  const allValues = points.flatMap((point) => [point.revenue, point.vendor, point.expense, point.profit]);
  const maxValue = Math.max(1, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const valueRange = Math.max(1, maxValue - minValue);
  const chartW = 1200;
  const chartH = 390;
  const plotLeft = 82;
  const plotRight = 18;
  const plotTop = 18;
  const plotBottom = 62;
  const plotW = chartW - plotLeft - plotRight;
  const plotH = chartH - plotTop - plotBottom;
  const xAt = (index: number) => points.length <= 1 ? plotLeft + plotW / 2 : plotLeft + (index / (points.length - 1)) * plotW;
  const yAt = (value: number) => plotTop + plotH - ((value - minValue) / valueRange) * plotH;
  const labelStride = range === 'Daily' ? 30 : range === 'Weekly' ? 4 : 1;
  const visibleLabels = points.filter((_, index) => index % labelStride === 0 || index === points.length - 1);
  const yTicks = Array.from({ length: 6 }, (_, index) => maxValue - (index * valueRange) / 5);
  const makePath = (key: keyof Pick<Point, 'revenue' | 'vendor' | 'expense' | 'profit'>) => smoothPath(points.map((point, index) => ({ x: xAt(index), y: yAt(point[key]) })));
  const hasData = allValues.some((value) => value !== 0);

  return (
    <div className="glass-panel w-full overflow-hidden px-4 sm:px-6 pt-5 pb-3 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-white/80" aria-hidden="true" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-[1]">
        <h2 className="text-[20px] sm:text-[21px] font-normal text-[#0f172a] tracking-[-0.01em]">Sales Graph</h2>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><i className="w-5 h-[2px] rounded-full bg-[#0f172a]" />Revenue</span>
            <span className="flex items-center gap-1.5"><i className="w-5 h-[2px] rounded-full bg-[#64748b]" />Vendor</span>
            <span className="flex items-center gap-1.5"><i className="w-5 h-[2px] rounded-full bg-[#d97706]" />Expense</span>
            <span className="flex items-center gap-1.5"><i className="w-5 h-[2px] rounded-full bg-[#15803d]" />Profit</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-6 text-[15px] sm:text-[16px] leading-none shrink-0">
            {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as Range[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={`relative pb-3 font-normal transition-colors text-[#0f172a] ${range === item ? 'text-[#0f172a]' : 'text-slate-400'}`}
              >
                {item}
                {range === item && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#0f172a] rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-[20px] bg-white/10">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="block w-full h-[320px] sm:h-[370px]" preserveAspectRatio="none" role="img" aria-label="Sales graph with revenue, vendor payments, expenses and profit">
          {yTicks.map((value, index) => {
            const y = yAt(value);
            return <g key={`y-${index}`}>
              <line x1={plotLeft} x2={chartW - plotRight} y1={y} y2={y} stroke={COLORS.grid} strokeWidth="1" />
              <text x={plotLeft - 12} y={y + 4} textAnchor="end" fontSize="11" fill={COLORS.text}>{moneyLabel(value, currencySymbol)}</text>
            </g>;
          })}

          {minValue < 0 && (
            <line x1={plotLeft} x2={chartW - plotRight} y1={yAt(0)} y2={yAt(0)} stroke="rgba(148, 163, 184, 0.40)" strokeWidth="1.2" />
          )}

          {visibleLabels.map((point, visibleIndex) => {
            const originalIndex = points.indexOf(point);
            const x = xAt(originalIndex);
            return <g key={`x-${point.label}-${visibleIndex}`}>
              <line x1={x} x2={x} y1={plotTop} y2={plotTop + plotH} stroke={COLORS.grid} strokeWidth="1" />
              <text transform={`translate(${x - 2},${plotTop + plotH + 20}) rotate(-55)`} textAnchor="end" fontSize="10.5" fill={COLORS.text}>{point.label}</text>
            </g>;
          })}

          <path d={makePath('revenue')} fill="none" stroke={COLORS.revenue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={makePath('vendor')} fill="none" stroke={COLORS.vendor} strokeWidth="1.9" strokeDasharray="7 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={makePath('expense')} fill="none" stroke={COLORS.expense} strokeWidth="1.9" strokeDasharray="3 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d={makePath('profit')} fill="none" stroke={COLORS.profit} strokeWidth="2" strokeDasharray="10 4" strokeLinecap="round" strokeLinejoin="round" />

          {(['revenue', 'vendor', 'expense', 'profit'] as const).map((key) => (
            <g key={key}>
              {points.map((point, index) => {
                const value = point[key];
                if (value === 0 && key !== 'profit') return null;
                return <circle key={`${key}-${point.label}-${index}`} cx={xAt(index)} cy={yAt(value)} r="2.1" fill="rgba(255,255,255,0.92)" stroke={COLORS[key]} strokeWidth="1.3" />;
              })}
            </g>
          ))}

          {!hasData && (
            <text x={chartW / 2} y={plotTop + plotH / 2} textAnchor="middle" fontSize="13" fill={COLORS.text}>No financial activity recorded yet</text>
          )}
        </svg>
      </div>
    </div>
  );
};
