import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CalendarCheck2,
  Building2,
  FileText,
  Settings,
  Store,
  X,
  LogOut,
  WalletCards,
} from 'lucide-react';
import { NavTab, BusinessProfile } from '../../types';
import { initialBusinessProfile } from '../../services/mockData';
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onTabChange?: (tab: NavTab) => void;
  profile?: BusinessProfile;
  isOpenMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onTabChange, profile, isOpenMobile, isMobileOpen, onCloseMobile }) => {
  const safeProfile = profile || initialBusinessProfile;
  const showMobileDrawer = isOpenMobile ?? isMobileOpen ?? false;
  const mainNavItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings' as NavTab, label: 'Bookings', icon: CalendarCheck2 },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarDays },
    { id: 'clients' as NavTab, label: 'Clients', icon: Users },
    { id: 'vendors' as NavTab, label: 'Vendors', icon: Building2 },
    { id: 'invoices' as NavTab, label: 'Invoices', icon: FileText },
    { id: 'finance' as NavTab, label: 'Profit & Loss', icon: WalletCards },
  ];
  const settingsNavItems = [
    { id: 'settings-invoice' as NavTab, label: 'Invoice Settings', icon: Settings },
    { id: 'settings-profile' as NavTab, label: 'Business Profile', icon: Store },
  ];
  const handleNavClick = (tab: NavTab) => { if (onSelectTab) onSelectTab(tab); if (onTabChange) onTabChange(tab); onCloseMobile(); };
  const renderNavItems = (items: typeof mainNavItems) => (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon; const isActive = currentTab === item.id;
        return <button key={item.id} id={`nav-${item.id}`} type="button" onClick={() => handleNavClick(item.id)} title={item.label} aria-label={item.label} className={`w-full group relative flex items-center justify-center px-2 py-2.5 rounded-2xl text-[13px] font-medium transition-all ${isActive ? 'bg-white/95 text-[#0f172a] font-bold shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-white/90' : 'text-slate-600 hover:text-[#0f172a] hover:bg-white/50 border border-transparent'}`}>{isActive && <span className="absolute left-1 w-1 h-5 rounded-full bg-[#0f172a]" />}<Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-[#0f172a]' : 'text-slate-500'}`} /></button>;
      })}
    </nav>
  );
  const navContent = (
    <div className="flex flex-col h-full justify-between p-3 overflow-y-auto">
      <div>
        <div className="flex items-center justify-center mb-5 px-1">
          {safeProfile.logoUrl ? <img src={safeProfile.logoUrl} alt={safeProfile.businessName || 'Business Logo'} className="w-11 h-11 object-contain rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-xs" /> : <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0f172a] to-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-slate-900/10">TE</div>}
          <button type="button" onClick={onCloseMobile} className="md:hidden ml-auto p-2 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all" aria-label="Close sidebar"><X className="w-5 h-5" /></button>
        </div>
        <div className="mb-5">{renderNavItems(mainNavItems)}</div>
        <div className="pt-4 border-t border-white/60">{renderNavItems(settingsNavItems)}</div>
      </div>
      <div className="pt-3 mt-3 border-t border-white/60 space-y-2">
        <button type="button" onClick={() => handleNavClick('settings-profile')} title="Business Profile" aria-label="Business Profile" className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${currentTab === 'settings-profile' ? 'bg-white/95 text-slate-900' : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'}`}><div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">{safeProfile.logoUrl ? <img src={safeProfile.logoUrl} alt="" className="w-full h-full object-contain bg-white" /> : safeProfile.ownerName ? safeProfile.ownerName.split(' ').map((n) => n[0]).slice(0, 2).join('') : 'TE'}</div></button>
        <button type="button" onClick={() => void handleLogout()} title="Log out" aria-label="Log out" className="w-full flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all"><LogOut className="w-5 h-5" /></button>
      </div>
    </div>
  );
  async function handleLogout() { try { await supabase.auth.signOut(); } finally { window.location.reload(); } }
  return <><aside className="hidden md:flex flex-col w-20 shrink-0 h-full bg-white/55 backdrop-blur-2xl border-r border-white/80 shadow-[4px_0_24px_rgba(15,23,42,0.02)] select-none no-print">{navContent}</aside>{showMobileDrawer && <div className="fixed inset-0 z-50 md:hidden no-print flex"><div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs transition-opacity" onClick={onCloseMobile} /><div className="relative w-72 max-w-[85vw] h-full bg-white/95 backdrop-blur-2xl border-r border-white/80 shadow-2xl z-10 animate-in slide-in-from-left duration-200">{navContent}</div></div>}</>;
};
