import React from 'react';
import { NavLink } from 'react-router-dom';
import { FuelcastLogo } from '../brand/FuelcastLogo';
import { IntelligentNetworkGraphic } from './IntelligentNetworkGraphic';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Sliders,
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Demand Forecast', path: '/forecast', icon: TrendingUp },
  { name: 'Supply Alerts', path: '/alerts', icon: AlertTriangle },
  { name: 'Network Map', path: '/map', icon: MapPin },
  { name: 'Impact Simulator', path: '/simulator', icon: Sliders },
];

export interface SideBarProps {
  onNavClick?: () => void;
  className?: string;
}

export const SideBar: React.FC<SideBarProps> = ({ onNavClick, className = '' }) => {
  return (
    <aside
      className={`w-64 bg-[#0B1320] text-slate-100 flex flex-col shrink-0 border-r border-slate-800/80 shadow-lg select-none h-full fuelcast-sidebar ${className}`}
      aria-label="Main Navigation"
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center border-b border-slate-800/80 bg-[#0B1320] shrink-0">
        <FuelcastLogo variant="full" size="md" subtitle="Gujarat Gas Co. Ltd." />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3.5 px-3 space-y-1 overflow-y-auto min-h-0">
        <div className="px-3 pt-0.5 pb-2 text-[10px] font-semibold tracking-wider uppercase text-slate-400/90 flex items-center justify-between">
          <span>Planning Modules</span>
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
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  isActive
                    ? 'bg-slate-800/90 text-white font-medium shadow-2xs border-l-[3px] border-[#0A9396] pl-[9px]'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    strokeWidth={1.8}
                    className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate flex-1">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
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

      {/* Bottom Section: Intelligent CNG Network Graphic (Seamless Borderless) */}
      <div className="px-3 pb-3 pt-1 mt-auto shrink-0">
        <IntelligentNetworkGraphic />
      </div>

      {/* Embedded style for subtle sidebar entrance animation */}
      <style>{`
        @keyframes fuelcastSidebarEntrance {
          from {
            opacity: 0.92;
            transform: translateX(-3px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .fuelcast-sidebar {
          animation: fuelcastSidebarEntrance 0.25s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .fuelcast-sidebar {
            animation: none !important;
          }
        }
      `}</style>
    </aside>
  );
};
