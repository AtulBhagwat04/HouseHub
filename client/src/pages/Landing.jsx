import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckSquare,
  Github,
  Receipt,
  Sparkles,
  Split,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks';
import Button from '@/components/ui/Button';

const FEATURES = [
  {
    icon: Receipt,
    title: 'Expenses that add up',
    body: 'Log rent, groceries, electricity or a dinner. Split equally, by exact amounts, or by percentage.',
  },
  {
    icon: Split,
    title: 'Exact to the paisa',
    body: 'Every split is stored as integer paise and the remainder is distributed deterministically, so ₹100 shared three ways is always 33.34 / 33.33 / 33.33.',
  },
  {
    icon: Wallet,
    title: 'Balances you can trust',
    body: 'Nothing is cached. Balances are rebuilt from your real expenses and confirmed settlements every time they are read.',
  },
  {
    icon: CheckSquare,
    title: 'Chores with a scoreboard',
    body: 'Assign chores with due dates and XP rewards. Completing one credits XP exactly once - even if two people tap at the same moment.',
  },
  {
    icon: Trophy,
    title: 'Levels and achievements',
    body: 'Earn XP, climb levels, unlock achievements and see who actually pulls their weight.',
  },
  {
    icon: Users,
    title: 'Built for a real house',
    body: 'Invite housemates with a link, give someone admin rights, or leave and join another house cleanly.',
  },
];

const STEPS = [
  { title: 'Create your account', body: 'Name, email, password. No card, no setup wizard.' },
  { title: 'Start or join a house', body: 'One tap to create, or paste the invite link your housemate sent.' },
  { title: 'Add your first expense', body: 'Choose who paid, who shared it, and HOUSEHUB does the maths.' },
];

export default function Landing() {
  useDocumentTitle('Split expenses, share chores');

  const { status, hasHouse } = useAuth();
  const signedIn = status === 'authenticated';

  const primaryCta = signedIn
    ? { to: hasHouse ? '/dashboard' : '/onboarding', label: hasHouse ? 'Go to dashboard' : 'Set up your house' }
    : { to: '/register', label: 'Get started free' };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
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

          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button as={Link} to={primaryCta.to} size="sm" icon={ArrowRight} iconPosition="right">
                {primaryCta.label}
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button as={Link} to="/register" size="sm">
                  Get started
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero ---------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-gradient-to-b from-primary/10 to-transparent blur-2xl" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Expenses, balances and chores in one place
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Stop splitting bills in the group chat.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              HOUSEHUB keeps the money honest and the chores moving for shared houses. Track who paid
              what, see exactly who owes whom, and settle up in two taps.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button as={Link} to={primaryCta.to} size="lg" icon={ArrowRight} iconPosition="right">
                {primaryCta.label}
              </Button>

              {!signedIn && (
                <Button as={Link} to="/login" size="lg" variant="outline">
                  I already have an account
                </Button>
              )}
            </div>

            <p className="mt-4 text-xs text-muted">
              Free to use &middot; No card required &middot; Your data stays yours
            </p>
          </div>
        </section>

        {/* Features ------------------------------------------------------ */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything a shared house argues about
            </h2>
            <p className="mt-2 text-muted">
              No spreadsheets, no &ldquo;I&rsquo;ll pay you back next week&rdquo; group polls.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:shadow-raised"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps --------------------------------------------------------- */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Set up in about a minute
                </h2>
                <p className="mt-2 max-w-lg text-muted">
                  HOUSEHUB is designed for two to twenty people in a flat, hostel or shared house.
                </p>

                <ol className="mt-8 space-y-5">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{step.title}</p>
                        <p className="mt-0.5 text-sm text-muted">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <Button as={Link} to={primaryCta.to} className="mt-8" icon={ArrowRight} iconPosition="right">
                  {primaryCta.label}
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 shadow-card sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Example &mdash; 4,000 grocery run
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b9811f] text-base">
                        🛒
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">Grocery shopping</p>
                        <p className="text-xs text-muted">Paid by Atul &middot; split 4 ways</p>
                      </div>
                    </div>
                    <p className="tabular text-sm font-semibold text-foreground">₹4,000.00</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-error/25 bg-error-soft p-3.5">
                      <p className="text-xs font-medium text-error">You owe</p>
                      <p className="tabular mt-1 text-lg font-semibold text-error">₹1,000.00</p>
                      <p className="mt-0.5 text-2xs text-muted">to Rahul</p>
                    </div>

                    <div className="rounded-xl border border-success/25 bg-success-soft p-3.5">
                      <p className="text-xs font-medium text-success">You are owed</p>
                      <p className="tabular mt-1 text-lg font-semibold text-success">₹0.00</p>
                      <p className="mt-0.5 text-2xs text-muted">all settled</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
                      <Trophy className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Rahul cleaned the kitchen</p>
                      <p className="text-xs text-muted">+30 XP &middot; level 3</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} HOUSEHUB. Built for shared houses.</p>

          <div className="flex items-center gap-4">
            <Link to="/login" className="transition hover:text-foreground">
              Sign in
            </Link>
            <Link to="/register" className="transition hover:text-foreground">
              Register
            </Link>
            <span className="flex items-center gap-1.5">
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>MERN stack</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
