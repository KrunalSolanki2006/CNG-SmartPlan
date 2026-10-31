import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SideBar, NAV_ITEMS } from './SideBar';
import { TopBar } from './TopBar';
import { Drawer } from '../ui/Drawer';
import { SubtleBackgroundAccent } from '../reactbits/SubtleBackgroundAccent';

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Find current page title and description from active route
  const currentNav = NAV_ITEMS.find((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
  );

  const pageTitle = currentNav?.name || 'CNG SmartPlan';

  const subtitles: Record<string, string> = {
    '/': 'Network demand summary, station inventory status, and early alert indicators',
    '/forecast': 'Chronological 7-day to 30-day station demand forecasting with baseline comparison',
    '/alerts': 'Potential supply-shortfall tracking against planned available supply',
    '/map': 'Ahmedabad geographic analysis and candidate location exploratory assessment',
    '/simulator': 'Catchment capture, network diversion, and net additional demand estimation',
    '/data-quality': 'Audit ledger, data gaps register, and synthetic data transparency documentation',
  };

  const pageSubtitle = subtitles[location.pathname] || 'Decision support platform for CNG planning';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA] text-[#0F172A]">
      {/* Desktop Persistent Sidebar */}
      <SideBar className="hidden lg:flex" />

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="CNG SmartPlan"
        position="left"
      >
        <SideBar onNavClick={() => setIsMobileMenuOpen(false)} className="w-full border-0" />
      </Drawer>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <SubtleBackgroundAccent />
        <TopBar
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
