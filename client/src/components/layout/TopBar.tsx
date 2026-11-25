import React from 'react';
import { Menu } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

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
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <IconButton
          ariaLabel="Open navigation menu"
          onClick={onMobileMenuOpen}
          className="lg:hidden text-slate-600 hover:text-slate-900"
        >
          <Menu className="w-5 h-5" />
        </IconButton>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
          </div>
          {pageSubtitle && (
            <p className="text-xs text-slate-500 font-normal hidden sm:block truncate max-w-lg">
              {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Operational system status & quick tour */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 text-xs font-medium bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="hidden sm:inline font-medium text-slate-700">Gujarat Gas CGD</span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-emerald-700 font-semibold">Network Planning Grid</span>
        </div>
      </div>
    </header>
  );
};
