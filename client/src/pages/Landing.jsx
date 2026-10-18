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
import { Brand, BrandMark } from '@/components/layout/Brand';
import { Button, Card } from '@/components/ui';

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
  { title: 'Create your account', body: 'Name, email and password.' },
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
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand to="/" size="md" />

          <nav className="flex items-center gap-1.5 sm:gap-2">
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
          <span aria-hidden="true" className="aurora-blob -left-24 -top-32 h-72 w-72 animate-aurora bg-primary/30" />
          <span
            aria-hidden="true"
            className="aurora-blob -right-24 top-4 h-80 w-80 animate-aurora bg-secondary/25 [animation-delay:-8s]"
          />
          <span aria-hidden="true" className="dot-grid mask-fade-b absolute inset-0 opacity-30" />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted shadow-card backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Expenses, balances and chores in one place
            </span>

            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
              Stop splitting bills in the <span className="text-gradient">group chat</span>.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Track who paid what, see exactly who owes whom, and keep the chores moving - built for
              shared houses.
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
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
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything a shared house argues about
            </h2>
            <p className="mt-2 text-muted">
              No spreadsheets, no &ldquo;I&rsquo;ll pay you back next week&rdquo; group polls.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="group transition duration-200 hover:-translate-y-0.5 hover:border-primary/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary transition group-hover:shadow-glow-sm">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Steps --------------------------------------------------------- */}
        <section className="relative border-y border-border bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Set up in about a minute
                </h2>
                <p className="mt-2 max-w-lg text-muted">
                  HOUSEHUB is designed for two to twenty people in a flat, hostel or shared house.
                </p>

                <ol className="mt-8 space-y-5">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="tabular bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-semibold text-white shadow-glow-sm">
                        {index + 1}
                      </span>
                      <div className="pt-0.5">
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

              <Card className="sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Example &mdash; 4,000 grocery run
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-soft text-base">
                        🛒
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">Grocery shopping</p>
                        <p className="truncate text-xs text-muted">Paid by Atul &middot; split 4 ways</p>
                      </div>
                    </div>
                    <p className="tabular shrink-0 text-sm font-semibold text-foreground">₹4,000.00</p>
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
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                      <Trophy className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">Rahul cleaned the kitchen</p>
                      <p className="text-xs text-muted">+30 XP &middot; level 3</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" glow={false} />
            <p>&copy; {new Date().getFullYear()} HOUSEHUB. Built for shared houses.</p>
          </div>

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
