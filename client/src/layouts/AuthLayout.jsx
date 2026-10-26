import { Outlet } from 'react-router-dom';
import { Check, CheckSquare, Receipt, ShieldCheck, Users, Wallet } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';

/**
 * Split-screen authentication layout.
 * Left: Clean, focused form.
 * Right: Realistic, human shared-living showcase (no AI neon glows or cosmic blobs).
 */
const HIGHLIGHTS = [
  { icon: Receipt, title: 'Smart bill splitting', desc: 'Equal, exact, or percentage splits with zero rounding errors.' },
  { icon: Wallet, title: 'Direct settlements', desc: 'Keep track of who paid whom with clear zero-debt balances.' },
  { icon: CheckSquare, title: 'Fair chore schedules', desc: 'Rotate house duties, set deadlines, and keep everyone accountable.' },
  { icon: ShieldCheck, title: 'Transparent for all', desc: 'Everyone sees the same numbers and transaction history in real time.' },
];

export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen bg-background">
      {/* ── Form side ────────────────────────────────────────────────────── */}
      <div className="relative flex w-full flex-col justify-between lg:w-[48%] lg:min-w-[460px] lg:border-r lg:border-border">
        <header className="flex h-16 items-center px-6 sm:px-12">
          <Brand to="/" size="md" />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-8 sm:px-12">
          <div className="w-full max-w-sm">
            {children || <Outlet />}
          </div>
        </main>

        <footer className="px-6 py-6 text-center text-xs text-muted sm:px-12">
          &copy; {new Date().getFullYear()} HOUSEHUB &middot; Built for shared living
        </footer>
      </div>

      {/* ── Editorial Product Showcase side ──────────────────────────────── */}
      <div className="relative hidden flex-1 flex-col justify-between bg-slate-900 p-12 text-slate-100 lg:flex dark:bg-slate-950">
        {/* Subtle decorative background pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top badge */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Designed for roommates & shared flats
          </span>
        </div>

        {/* Center content + interactive mockup card */}
        <div className="relative z-10 max-w-lg space-y-8">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Shared living, without the money awkwardness.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              HouseHub gives your flat a single place to split grocery runs, track rent and utilities, and manage weekly chores fairly.
            </p>
          </div>

          {/* Realistic Roommate Activity Mockup Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-850/90 p-5 shadow-2xl backdrop-blur-sm bg-slate-900/90">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                  4B
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">Greenwood Flat #4B</p>
                  <p className="text-3xs text-slate-400">3 roommates &middot; All settled up</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-3xs font-semibold text-emerald-400">
                Live house
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold text-xs">
                    🛒
                  </span>
                  <div>
                    <p className="font-medium text-white">Sunday Supermarket Restock</p>
                    <p className="text-3xs text-slate-400">Paid by Rahul &middot; Split 3 ways</p>
                  </div>
                </div>
                <span className="font-semibold text-white tabular">₹2,400</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-semibold text-xs">
                    🧹
                  </span>
                  <div>
                    <p className="font-medium text-white">Kitchen & Living Deep Clean</p>
                    <p className="text-3xs text-slate-400">Assigned to Priya &middot; Due Saturday</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-3xs font-medium text-emerald-400">
                  <Check className="h-3 w-3" /> Done
                </span>
              </div>
            </div>
          </div>

          {/* Pillars list */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="flex gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-emerald-400">
                  <h.icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white">{h.title}</p>
                  <p className="mt-0.5 text-3xs leading-relaxed text-slate-400">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust indicators */}
        <div className="relative z-10 flex items-center gap-6 border-t border-slate-800/80 pt-6 text-xs text-slate-400">
          <div>
            <p className="font-bold text-white">100% Free</p>
            <p className="text-3xs">No subscriptions or hidden fees</p>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div>
            <p className="font-bold text-white">Exact Math</p>
            <p className="text-3xs">Accurate to the last paise</p>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div>
            <p className="font-bold text-white">Privacy First</p>
            <p className="text-3xs">Your house data stays private</p>
          </div>
        </div>
      </div>
    </div>
  );
}
