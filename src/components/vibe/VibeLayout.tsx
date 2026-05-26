import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import VibeHeader from './VibeHeader';
import VibeMobileNav from './VibeMobileNav';

export default function VibeLayout() {
  const location = useLocation();
  
  // Hide header and mobile nav on specific paths if needed
  const hideMobileNavPaths = ['/live', '/checkout'];
  const showMobileNav = !hideMobileNavPaths.includes(location.pathname);

  const hideHeaderPaths = ['/live', '/vibe'];
  const showHeader = !hideHeaderPaths.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-[64px] pt-16">
      {showHeader && <VibeHeader />}
      <main className="flex-1">
        <Outlet />
      </main>
      {showMobileNav && <VibeMobileNav />}
    </div>
  );
}
