import React from 'react';
import { BookingStatus, PaymentStatus } from '../../types';

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | string;
  type?: 'booking' | 'payment';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let colorStyle = 'bg-slate-100 text-slate-600';

  switch (status) {
    case 'Confirmed':
    case 'Paid':
      colorStyle = 'bg-emerald-50 text-emerald-600';
      break;
    case 'Inquiry':
      colorStyle = 'bg-orange-50 text-orange-600';
      break;
    case 'Pending':
      colorStyle = 'bg-rose-50 text-rose-600';
      break;
    case 'Completed':
    case 'Planning':
      colorStyle = 'bg-blue-50 text-blue-600';
      break;
    case 'Cancelled':
      colorStyle = 'bg-slate-100 text-slate-400';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${colorStyle} ${className}`}
    >
      {status}
    </span>
  );
};

