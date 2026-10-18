import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { NAV_SECTIONS } from './navItems';
import { BrandMark } from './Brand';
import XpBadge from '@/components/ui/XpBadge';
import Avatar from '@/components/ui/Avatar';

const spring = { type: 'spring', stiffness: 420, damping: 34 };

/**
 * Desktop sidebar.
 *
 * Fixed width, own scroll region, and the user's XP card pinned to the bottom so
 * progress is ambient rather than something you have to go and look for.
 *
 * The active highlight is a Framer Motion `layoutId`, which makes the panel slide
 * between destinations instead of blinking on and off as routes change.
 */
export default function Sidebar() {
  const { user, house, isManager } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="relative hidden w-[17rem] shrink-0 flex-col border-r border-border/70 bg-surface/50 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border/70 px-5">
        <BrandMark size="md" />

        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold tracking-tight text-foreground">HOUSEHUB</p>
          <p className="truncate text-2xs text-muted" title={house?.name}>
            {house?.name || 'No house yet'}
          </p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.managerOnly || isManager);
          if (items.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.1em] text-muted/70">
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
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'text-primary'
                            : 'text-muted hover:bg-surface-muted/70 hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="sidebar-nav-pill"
                              transition={spring}
                              className="absolute inset-0 rounded-xl border border-primary/15 bg-primary-soft"
                            />
                          )}

                          <item.icon className="relative h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                          <span className="relative min-w-0 flex-1 truncate">{item.label}</span>

                          {item.badge === 'unread' && unreadCount > 0 && (
                            <span className="tabular relative flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-2xs font-semibold text-white">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border/70 p-3">
        <NavLink
          to="/profile"
          className="block rounded-2xl border border-transparent p-2.5 transition hover:border-border hover:bg-surface-muted/60"
        >
          <div className="flex items-center gap-2.5">
            <Avatar src={user?.avatarUrl} name={user?.name} size="md" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
              <p className="truncate text-xs text-muted">{house?.name || 'No house'}</p>
            </div>
          </div>

          {user && <XpBadge xp={user.xp} level={user.level} className="mt-3" />}
        </NavLink>
      </div>
    </aside>
  );
}
