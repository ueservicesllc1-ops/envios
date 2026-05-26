import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import MobileNav from './MobileNav';

export default function Layout() {
  const location = useLocation();
  const hideMobileNavPaths = ['/live', '/checkout'];
  const showMobileNav = !hideMobileNavPaths.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen pb-[64px]">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {showMobileNav && <MobileNav />}
    </div>
  );
}
