import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * The signed-in shell: fixed sidebar on desktop, bottom bar + menu sheet on
 * phones, one scrollable main region.
 * Clean, fast, solid application layout — no distracting aurora blur blobs.
 */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-10">
            <ErrorBoundary>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <MobileNav menuOpen={menuOpen} onCloseMenu={setMenuOpen} />
    </div>
  );
}
