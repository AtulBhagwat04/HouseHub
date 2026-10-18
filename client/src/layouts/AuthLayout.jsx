import { Link, Outlet } from 'react-router-dom';
import { CheckSquare, Receipt, Sparkles, Trophy, Users } from 'lucide-react';

/**
 * Split-screen shell for the signed-out pages.
 *
 * The right panel is the sales pitch (what the app does), the left is the form.
 * On phones the pitch collapses to a compact header so the form is above the
 * fold, which is what actually matters on a small screen.
 */
const HIGHLIGHTS = [
  { icon: Receipt, title: 'Split any bill', body: 'Equal, custom or percentage - in exact paise, with no rounding drift.' },
  { icon: Users, title: 'See who owes whom', body: 'Balances are always derived from real expenses, so they can never go stale.' },
  { icon: CheckSquare, title: 'Share the chores', body: 'Assign, track and complete. XP is credited the moment it is done.' },
  { icon: Trophy, title: 'Level up together', body: 'XP, levels, streaks and a leaderboard that makes tidying up competitive.' },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Form side ------------------------------------------------------- */}
      <div className="flex w-full flex-col lg:w-[46%] lg:min-w-[460px]">
        <header className="flex h-16 items-center px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-foreground">HOUSEHUB</span>
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-sm animate-slide-up">
            <Outlet />
          </div>
        </main>

        <footer className="px-5 pb-6 text-center text-xs text-muted sm:px-8">
          &copy; {new Date().getFullYear()} HOUSEHUB &middot; Built for shared houses
        </footer>
      </div>

      {/* Pitch side ------------------------------------------------------ */}
      <div className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-primary to-secondary lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col justify-center gap-8 px-14 py-16 text-white">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Money and chores, finally settled
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight">
              Run your shared house without the group-chat maths.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Track expenses, settle up fairly, and keep the chores moving - all in one place your
              housemates will actually use.
            </p>
          </div>

          <ul className="grid max-w-md gap-5 sm:grid-cols-2">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  <item.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/80">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
