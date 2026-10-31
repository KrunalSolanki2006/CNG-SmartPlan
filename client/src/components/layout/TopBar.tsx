import React from 'react';
import { Menu, Activity, ShieldAlert } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { DataOriginBadge } from '../ui/DataOriginBadge';

export interface TopBarProps {
  onMobileMenuOpen: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMobileMenuOpen,
  pageTitle = 'Dashboard',
  pageSubtitle,
}) => {
  return (
    <header className="h-16 bg-white border-b border-[#DCE4E8] px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <IconButton
          ariaLabel="Open navigation menu"
          onClick={onMobileMenuOpen}
          className="lg:hidden text-[#142B3A]"
        >
          <Menu className="w-5 h-5" />
        </IconButton>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
              {pageTitle}
            </h1>
            <span className="hidden sm:inline-block text-[11px] font-medium text-slate-400">
              | PS000002
            </span>
          </div>
          {pageSubtitle && (
            <p className="text-xs text-[#64748B] hidden sm:block truncate max-w-md">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Integrity badges & Context */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-2 text-xs text-[#64748B] bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
          <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Ahmedabad Study Area</span>
        </div>

        {/* Global Data Origin status */}
        <DataOriginBadge origin="synthetic_demo" size="sm" />

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>0 Map Pins Approved</span>
        </div>
      </div>
    </header>
  );
};
