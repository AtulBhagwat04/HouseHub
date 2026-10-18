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
 *
 * `h-screen` + `overflow-hidden` on the shell and `overflow-y-auto` on main is
 * deliberate - it keeps the sidebar and top bar fixed without `position: fixed`
 * hacks, so the mobile address bar collapsing doesn't jolt the layout.
 *
 * The ambient blobs and the per-route transition live here rather than in the
 * pages, so every screen gets the same motion without opting in.
 */
export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Ambient accent glow behind the whole shell. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="aurora-blob -left-40 -top-48 h-[26rem] w-[26rem] animate-aurora bg-primary/20" />
        <span className="aurora-blob -right-32 top-1/4 h-[22rem] w-[22rem] animate-aurora bg-secondary/15 [animation-delay:-8s]" />
      </div>

      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />

        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:pb-10">
            <ErrorBoundary>
              {/* mode="wait" so the outgoing page finishes before the new one
                  enters; `initial={false}` keeps the very first paint still. */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
