import React from 'react';
import { Menu, FileText } from 'lucide-react';
import { BusinessProfile } from '../../types';
import { initialBusinessProfile } from '../../services/mockData';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
  onOpenMobileSidebar?: () => void;
  onNewInvoice: () => void;
  profile?: BusinessProfile;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenMobileSidebar, onNewInvoice, profile }) => {
  const safeProfile = profile || initialBusinessProfile;
  const handleOpenMenu = onOpenMobileMenu || onOpenMobileSidebar || (() => {});

  return (
    <header className="shrink-0 z-20 bg-white/40 backdrop-blur-xl border-b border-white/70 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between no-print select-none">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" onClick={handleOpenMenu} className="md:hidden p-2 text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white rounded-xl shadow-xs border border-white/80" aria-label="Open navigation menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-[#0f172a] tracking-tight truncate">Operations Dashboard</h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">Active Studio</span>
          </div>
          <p className="text-slate-500 text-xs font-medium truncate">{safeProfile.businessName || 'Together Events'} • Events, bookings &amp; payments</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <button type="button" id="btn-quick-new-invoice" onClick={onNewInvoice} className="inline-flex items-center gap-1.5 bg-[#0f172a] text-white px-4 py-2 rounded-2xl text-xs font-semibold shadow-md shadow-slate-900/10 hover:bg-slate-800 active:scale-95 transition-all">
          <FileText className="w-3.5 h-3.5" />
          <span>New Invoice</span>
        </button>
      </div>
    </header>
  );
};
