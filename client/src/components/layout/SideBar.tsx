import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  AlertCircle,
  MapPin,
  Sliders,
  ShieldCheck,
  Flame,
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Demand Forecast', path: '/forecast', icon: TrendingUp },
  { name: 'Supply Alerts', path: '/alerts', icon: AlertCircle },
  { name: 'Network Map', path: '/map', icon: MapPin },
  { name: 'Impact Simulator', path: '/simulator', icon: Sliders, badge: 'Signature' },
  { name: 'Data Quality & Provenance', path: '/data-quality', icon: ShieldCheck },
];

export interface SideBarProps {
  onNavClick?: () => void;
  className?: string;
}

export const SideBar: React.FC<SideBarProps> = ({ onNavClick, className = '' }) => {
  return (
    <aside
      className={`w-64 bg-[#142B3A] text-slate-100 flex flex-col shrink-0 border-r border-[#0D1C26]/50 select-none ${className}`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-sm shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white truncate">
              CNG SmartPlan
            </span>
            <span className="text-[10px] font-semibold bg-[#DDF3EF]/20 text-[#2DD4BF] px-1.5 py-0.2 rounded border border-[#0F766E]/40">
              v1.0
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate">Gujarat Gas Co. Ltd.</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
          Planning Modules
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-[#1B384B] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate flex-1">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#DDF3EF]/10 text-[#2DD4BF] border border-[#0F766E]/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Integrity Alert / Scope indicator */}
      <div className="p-3.5 m-3 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Decision Support</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Synthetic demo data active. Station coordinates unverified. Not for direct dispatch.
        </p>
      </div>
    </aside>
  );
};
