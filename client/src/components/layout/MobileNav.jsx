import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { NAV_SECTIONS, PRIMARY_NAV_ITEMS } from './navItems';
import { BrandMark } from './Brand';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

/**
 * Mobile navigation: a crisp bottom tab bar plus a clean slide-in menu sheet.
 */
export default function MobileNav({ menuOpen, onCloseMenu }) {
  const { user, house, isManager, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  // Any navigation dismisses the sheet.
  useEffect(() => {
    onCloseMenu(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Escape closes it too.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onCloseMenu(false);
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [menuOpen, onCloseMenu]);

  if (!house) return null;

  return (
    <>
      {/* Bottom bar ------------------------------------------------------ */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1 py-2 text-2xs font-medium transition-colors',
                    isActive ? 'text-primary font-semibold' : 'text-muted hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="mobile-tab-indicator"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary"
                      />
                    )}

                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate px-0.5">{item.label.split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => onCloseMenu(!menuOpen)}
              aria-expanded={menuOpen}
              className={cn(
                'flex w-full flex-col items-center gap-1 py-2 text-2xs font-medium transition-colors',
                menuOpen ? 'text-primary font-semibold' : 'text-muted hover:text-foreground',
              )}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Sheet ----------------------------------------------------------- */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => onCloseMenu(false)}
              aria-hidden="true"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col border-r border-border bg-surface shadow-pop"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2.5">
                  <BrandMark size="sm" />
                  <p className="font-display text-sm font-bold tracking-tight text-foreground">HOUSEHUB</p>
                </div>

                <Button variant="ghost" size="icon-sm" onClick={() => onCloseMenu(false)} aria-label="Close navigation menu">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3 border-b border-border p-4 bg-surface-muted/30">
                <Avatar src={user?.avatarUrl} name={user?.name} size="md" />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="truncate text-xs text-muted">{house.name}</p>
                </div>

                <span className="tabular ml-auto shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-600 dark:text-amber-400">
                  Lv {user?.level || 1}
                </span>
              </div>

              <nav className="scrollbar-thin flex-1 overflow-y-auto p-3">
                {NAV_SECTIONS.map((section) => {
                  const items = section.items.filter((item) => !item.managerOnly || isManager);
                  if (items.length === 0) return null;

                  return (
                    <div key={section.label} className="mb-4">
                      <p className="mb-1.5 px-3 text-3xs font-semibold uppercase tracking-wider text-muted/70">
                        {section.label}
                      </p>

                      <ul className="flex flex-col gap-0.5">
                        {items.map((item) => (
                          <li key={item.to}>
                            <NavLink
                              to={item.to}
                              end={item.end}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                                  isActive
                                    ? 'bg-primary-soft text-primary font-semibold'
                                    : 'text-muted hover:bg-surface-muted hover:text-foreground',
                                )
                              }
                            >
                              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {item.badge === 'unread' && unreadCount > 0 && (
                                <span className="tabular rounded-full bg-error px-1.5 py-0.5 text-2xs font-semibold text-white">
                                  {unreadCount}
                                </span>
                              )}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </nav>

              <div className="border-t border-border p-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    logout();
                    onCloseMenu(false);
                  }}
                >
                  Sign out
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
