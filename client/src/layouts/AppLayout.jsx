import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * The signed-in shell: fixed sidebar on desktop, bottom bar + menu sheet on
 * phones, one scrollable main region.
 *
 * `h-screen` + `overflow-hidden` on the shell and `overflow-y-auto` on main is
 * deliberate - it keeps the sidebar and top bar fixed without `position: fixed`
 * hacks, so the mobile address bar collapsing doesn't jolt the layout.
 */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-10">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <MobileNav menuOpen={menuOpen} onCloseMenu={setMenuOpen} />
    </div>
  );
}
