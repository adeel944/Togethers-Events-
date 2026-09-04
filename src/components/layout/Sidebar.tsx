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
  Sparkles,
  X,
  MessageSquare,
  Home,
  CheckCircle2
} from 'lucide-react';
import { NavTab, BusinessProfile } from '../../types';
import { initialBusinessProfile } from '../../services/mockData';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  onTabChange?: (tab: NavTab) => void;
  profile?: BusinessProfile;
  isOpenMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onTabChange,
  profile,
  isOpenMobile,
  isMobileOpen,
  onCloseMobile,
}) => {
  const safeProfile = profile || initialBusinessProfile;
  const showMobileDrawer = isOpenMobile ?? isMobileOpen ?? false;

  const mainNavItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings' as NavTab, label: 'Bookings', icon: CalendarCheck2 },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarDays },
    { id: 'clients' as NavTab, label: 'Clients', icon: Users },
    { id: 'vendors' as NavTab, label: 'Vendors', icon: Building2 },
    { id: 'invoices' as NavTab, label: 'Invoices', icon: FileText },
  ];

  const settingsNavItems = [
    { id: 'settings-invoice' as NavTab, label: 'Invoice Settings', icon: Settings },
    { id: 'settings-profile' as NavTab, label: 'Business Profile', icon: Store },
  ];

  const handleNavClick = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    if (onTabChange) onTabChange(tab);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-5 lg:p-6 overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-3 min-w-0">
            {safeProfile.logoUrl ? (
              <img
                src={safeProfile.logoUrl}
                alt={safeProfile.businessName || 'Business Logo'}
                className="w-10 h-10 object-contain rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0f172a] to-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-slate-900/10 shrink-0">
                TE
              </div>
            )}
            <div className="min-w-0">
              <span className="text-base font-extrabold tracking-tight text-[#0f172a] block leading-tight truncate">
                {safeProfile.businessName || 'Together Events'}
              </span>
              <span className="text-[10px] block text-slate-500 font-semibold tracking-wider uppercase">
                Event Suite
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-white/80 rounded-xl transition-all"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Top Segmented Cards (Inspired by Reference top cards) */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border transition-all text-center ${
              currentTab === 'dashboard'
                ? 'bg-white/95 border-white/90 text-[#0f172a] shadow-xs font-semibold'
                : 'bg-white/40 border-white/60 text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4 mb-1 text-slate-700" />
            <span className="text-[11px]">Home</span>
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('calendar')}
            className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border transition-all text-center ${
              currentTab === 'calendar'
                ? 'bg-white/95 border-white/90 text-[#0f172a] shadow-xs font-semibold'
                : 'bg-white/40 border-white/60 text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 mb-1 text-slate-700" />
            <span className="text-[11px]">Calendar</span>
          </button>
        </div>

        {/* Main Navigation */}
        <div className="mb-6">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Management
            </span>
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full group relative flex items-center px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-white/95 text-[#0f172a] font-bold shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-white/90'
                      : 'text-slate-600 hover:text-[#0f172a] hover:bg-white/50 border border-transparent'
                  }`}
                >
                  {/* Reference indicator capsule on active item */}
                  {isActive && (
                    <span className="absolute left-1.5 w-1 h-5 rounded-full bg-[#0f172a]" />
                  )}
                  <Icon
                    className={`w-4 h-4 mr-3 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-[#0f172a] ml-1' : 'text-slate-500 ml-0'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Navigation */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Settings & Customization
            </span>
          </div>
          <nav className="space-y-1">
            {settingsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full group relative flex items-center px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-white/95 text-[#0f172a] font-bold shadow-[0_4px_16px_rgba(15,23,42,0.05)] border border-white/90'
                      : 'text-slate-600 hover:text-[#0f172a] hover:bg-white/50 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-1.5 w-1 h-5 rounded-full bg-[#0f172a]" />
                  )}
                  <Icon
                    className={`w-4 h-4 mr-3 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-[#0f172a] ml-1' : 'text-slate-500 ml-0'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Profile Pill (Inspired by Reference bottom area) */}
      <div className="pt-4 mt-4 border-t border-white/60">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {safeProfile.ownerName
                ? safeProfile.ownerName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : 'TE'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0f172a] truncate leading-tight">
                {safeProfile.ownerName || 'Jane Doe'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {safeProfile.city || 'Event Planner'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleNavClick('settings-profile')}
            title="Business profile"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Dedicated Sidebar Column (Flex Child - NEVER overlaps content) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-full bg-white/55 backdrop-blur-2xl border-r border-white/80 shadow-[4px_0_24px_rgba(15,23,42,0.02)] select-none no-print">
        {navContent}
      </aside>

      {/* Mobile Drawer (Only visible on mobile when toggled) */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden no-print flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Slide-over panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white/95 backdrop-blur-2xl border-r border-white/80 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
