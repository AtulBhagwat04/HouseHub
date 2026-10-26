import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  HeartHandshake,
  Home,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Split,
  Trophy,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks';
import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui';

/* ─── Features data ─────────────────────────────────────────────────────────── */

const CORE_FEATURES = [
  {
    icon: Split,
    title: 'Smart, deterministic bill splits',
    body: 'Divide costs equally, by exact rupee amounts, or customized shares. Calculated down to the last paise with zero rounding errors.',
    tag: 'Accurate to the paisa',
  },
  {
    icon: Wallet,
    title: 'Automated debt simplification',
    body: 'No chaotic web of transfers. HouseHub calculates the shortest, simplest path for roommates to settle up with each other.',
    tag: 'Zero drama',
  },
  {
    icon: CheckSquare,
    title: 'Shared chore rotations',
    body: 'Assign cleaning, trash, and cooking duties with clear deadlines. Everyone knows what is expected of them without nagging.',
    tag: 'Fair housework',
  },
  {
    icon: Trophy,
    title: 'Friendly house leaderboard',
    body: 'Earn XP for completing chores on time. Gamify mundane apartment chores so taking out the bins actually gets rewarded.',
    tag: 'Roommate XP',
  },
  {
    icon: Users,
    title: 'Instant roommate onboarding',
    body: 'Send your flatmates a simple 6-character code or link. They join the flat in 20 seconds without lengthy forms.',
    tag: 'Quick setup',
  },
  {
    icon: ShieldCheck,
    title: '100% Transparent ledger',
    body: 'Every expense, edit, and settlement is recorded. Roommates see the exact same numbers, balances, and receipts in real time.',
    tag: 'Full audit trail',
  },
];

const SCENARIOS = [
  {
    title: 'College & University Flats',
    desc: 'Late-night food orders, grocery restocks, and split electricity bills without awkward WhatsApp reminders.',
    badge: 'Students',
  },
  {
    title: 'Working Professionals (2BHK / 3BHK)',
    desc: 'Track cook & maid monthly salaries, Wi-Fi, drinking water cans, and deep cleaning schedules effortlessly.',
    badge: 'Co-living',
  },
  {
    title: 'Long-term Roommates & Friends',
    desc: 'Maintain transparent yearly expenses, security deposit settlements, and shared kitchen inventory with peace of mind.',
    badge: 'Long-term',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'We used to have a 400-message WhatsApp group just discussing who bought milk and who paid the cook. HouseHub turned that into zero messages.',
    author: 'Aditya & Rahul',
    role: 'Koramangala 3BHK, Bengaluru',
    tag: 'Saved 2 hrs/week',
  },
  {
    quote:
      'The chore rotation with XP is genius. For the first time in two years, our flat kitchen is actually clean on Sunday mornings.',
    author: 'Sneha M.',
    role: 'Hauz Khas Flat, New Delhi',
    tag: 'Clean flat',
  },
  {
    quote:
      'The debt simplification is amazing. Instead of four different UPI transactions, HouseHub tells us just two people need to transfer once.',
    author: 'Vikram & Flatmates',
    role: 'Gachibowli, Hyderabad',
    tag: 'Zero debt headaches',
  },
];

const FAQ = [
  {
    q: 'How does HouseHub calculate splits?',
    a: 'You can choose between equal split among all or selected roommates, exact rupee amounts per person, or custom percentages. All splits are calculated in integer paise so there are zero rounding discrepancies.',
  },
  {
    q: 'Is HouseHub really free?',
    a: 'Yes, HouseHub is completely free for shared houses and roommates. There are no subscription tiers, paywalls, or credit card requirements.',
  },
  {
    q: 'How do flatmates settle up when money is owed?',
    a: 'When someone pays back a flatmate (e.g. via UPI, cash, or bank transfer), either person can record the settlement in HouseHub. Once confirmed by the recipient, balances update instantly.',
  },
  {
    q: 'What if a new roommate moves in or someone leaves?',
    a: 'House managers can invite new roommates via code or link anytime. Leaving members can settle their final net balance to zero before departing.',
  },
  {
    q: 'Can we use HouseHub on our phones?',
    a: 'Yes, HouseHub is fully responsive and designed mobile-first, with dedicated navigation tabs and fast touch-friendly actions on iOS and Android browsers.',
  },
];

/* ─── FAQ Accordion Item ────────────────────────────────────────────────────── */

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border py-4 transition-colors">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 text-left font-display text-sm font-semibold text-foreground hover:text-primary transition-colors"
        aria-expanded={open}
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>
      {open && (
        <p className="mt-2.5 text-sm leading-relaxed text-muted animate-fade-in pr-6">
          {a}
        </p>
      )}
    </div>
  );
}

/* ─── Realistic Application Preview Mockup ──────────────────────────────────── */

function AppPreviewMock() {
  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-pop">
      {/* Window Header */}
      <div className="flex h-11 items-center justify-between border-b border-border bg-surface-muted/60 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 hidden text-xs font-medium text-muted sm:inline-block">
            Apartment #302 &middot; 3 Flatmates &middot; Bengaluru
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> All settled up
          </span>
        </div>
      </div>

      {/* Financial Metric Row */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
        <div className="rounded-xl border border-border bg-surface p-3.5">
          <p className="text-2xs font-medium text-muted">House Total This Month</p>
          <p className="tabular mt-1 text-xl font-bold tracking-tight text-foreground">₹32,400</p>
          <p className="mt-0.5 text-2xs text-muted">12 shared expenses</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <p className="text-2xs font-medium text-muted">You Owe</p>
          <p className="tabular mt-1 text-xl font-bold tracking-tight text-foreground">₹0</p>
          <p className="mt-0.5 text-2xs text-emerald-600 dark:text-emerald-400 font-medium">Clear balance</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <p className="text-2xs font-medium text-muted">Owed to You</p>
          <p className="tabular mt-1 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            +₹1,450
          </p>
          <p className="mt-0.5 text-2xs text-muted">From Alex &amp; Priya</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3.5">
          <p className="text-2xs font-medium text-muted">House Chore XP</p>
          <p className="tabular mt-1 text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            18,450 XP
          </p>
          <p className="mt-0.5 text-2xs text-muted">Rank #1 Flatmate</p>
        </div>
      </div>

      {/* Two Modules: Recent Bills + Weekly Chores */}
      <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
        {/* Expenses List */}
        <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5">
          <div className="flex items-center justify-between pb-2.5">
            <p className="text-xs font-semibold text-foreground">Recent Household Expenses</p>
            <span className="text-2xs text-muted">Real-time</span>
          </div>

          <div className="space-y-2">
            {[
              {
                icon: '🛒',
                name: 'Nature Basket Grocery',
                payer: 'Paid by You &middot; Split 3 ways',
                amount: '₹2,400',
                share: '+₹1,600 owed',
                positive: true,
              },
              {
                icon: '⚡',
                name: 'BESCOM Electricity Bill',
                payer: 'Paid by Alex &middot; Equal split',
                amount: '₹1,850',
                share: 'Settled ✓',
                positive: false,
              },
              {
                icon: '📶',
                name: 'Airtel Gigabit Wi-Fi',
                payer: 'Paid by Priya &middot; Equal split',
                amount: '₹1,180',
                share: 'Settled ✓',
                positive: false,
              },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm">
                    {item.icon}
                  </span>
                  <div className="min-w-0 truncate">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    <p className="truncate text-3xs text-muted" dangerouslySetInnerHTML={{ __html: item.payer }} />
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <p className="tabular font-semibold text-foreground">{item.amount}</p>
                  <p className={`tabular text-3xs font-medium ${item.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted'}`}>
                    {item.share}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chores Duty List */}
        <div className="rounded-xl border border-border bg-surface-muted/30 p-3.5">
          <div className="flex items-center justify-between pb-2.5">
            <p className="text-xs font-semibold text-foreground">Weekly Chore Rotation</p>
            <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-medium">92% On-time</span>
          </div>

          <div className="space-y-2">
            {[
              {
                title: 'Living Room & Balcony Sweep',
                assigned: 'Assigned to You',
                deadline: 'Done Today',
                status: 'Completed',
                statusTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              },
              {
                title: 'Kitchen Deep Clean & Counters',
                assigned: 'Assigned to Alex',
                deadline: 'Due Tomorrow',
                status: 'In progress',
                statusTone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
              },
              {
                title: 'Garbage & Recycling Bins',
                assigned: 'Assigned to Priya',
                deadline: 'Due Sunday',
                status: 'Upcoming',
                statusTone: 'bg-surface-muted text-muted',
              },
            ].map((chore) => (
              <div
                key={chore.title}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-surface p-2.5 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate font-medium text-foreground">{chore.title}</p>
                  <p className="text-3xs text-muted">
                    {chore.assigned} &middot; {chore.deadline}
                  </p>
                </div>

                <span className={`shrink-0 rounded px-1.5 py-0.5 text-3xs font-semibold ${chore.statusTone}`}>
                  {chore.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Landing Page ─────────────────────────────────────────────────────── */

export default function Landing() {
  useDocumentTitle('HouseHub — Smart Shared Living & Bill Splitting');

  const { status, hasHouse } = useAuth();
  const signedIn = status === 'authenticated';

  const primaryCta = signedIn
    ? { to: hasHouse ? '/dashboard' : '/onboarding', label: hasHouse ? 'Go to dashboard' : 'Set up your house' }
    : { to: '/register', label: 'Start your house free' };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Brand to="/" size="md" />

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#scenarios" className="transition-colors hover:text-foreground">
              Use cases
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {signedIn ? (
              <Button as={Link} to={primaryCta.to} size="sm" icon={ArrowRight} iconPosition="right">
                {primaryCta.label}
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </Button>
                <Button as={Link} to="/register" size="sm" icon={ArrowRight} iconPosition="right">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero Section ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            {/* Pill */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-medium text-foreground shadow-subtle">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                The modern operating system for shared flats
              </span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto mt-6 max-w-3xl text-balance text-center font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Split bills with roommates without the math or the drama.
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-5 max-w-2xl text-balance text-center text-base leading-relaxed text-muted sm:text-lg">
              HouseHub gives your flat a clean, transparent way to divide grocery runs, track utilities and rent, and share weekly chores fairly.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button as={Link} to={primaryCta.to} size="lg" icon={ArrowRight} iconPosition="right" className="w-full sm:w-auto">
                {primaryCta.label}
              </Button>
              {!signedIn && (
                <Button as={Link} to="/login" size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign in to existing flat
                </Button>
              )}
            </div>

            {/* Trust highlights */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 100% Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Paisa-exact math
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> 30-second setup
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> No credit card
              </span>
            </div>

            {/* Interactive Preview Mockup */}
            <div className="mt-12 sm:mt-16">
              <AppPreviewMock />
            </div>
          </div>
        </section>

        {/* ── Features Grid ─────────────────────────────────────────────────── */}
        <section id="features" className="border-t border-border bg-surface-muted/30 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="section-label">Features</span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Everything your shared home needs, and nothing it doesn't.
              </h2>
              <p className="mt-2 text-sm text-muted sm:text-base">
                Built specifically for real roommate living. Stop juggling messy spreadsheets or arguing over who bought laundry detergent.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-surface p-6 shadow-subtle transition-all duration-150 hover:shadow-card hover:border-border/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-3xs font-medium text-muted">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-border py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="text-center max-w-xl mx-auto">
              <span className="section-label">How it works</span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Up and running in three simple steps
              </h2>
              <p className="mt-2 text-sm text-muted">
                No complex onboarding or lengthy configurations. Start dividing expenses in seconds.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Create & Invite Flatmates',
                  desc: 'Name your house and share the instant invite link or 6-digit code with your roommates.',
                },
                {
                  step: '02',
                  title: 'Log Expenses & Chores',
                  desc: 'Add shared grocery bills, utilities, and weekly chore assignments in two taps.',
                },
                {
                  step: '03',
                  title: 'Settle Up with Zero Stress',
                  desc: 'See live who owes whom and record settlements directly to maintain zero-debt harmony.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border border-border bg-surface p-6 shadow-subtle"
                >
                  <span className="font-mono text-2xl font-bold text-primary">
                    {item.step}
                  </span>
                  <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Living Scenarios ──────────────────────────────────────────────── */}
        <section id="scenarios" className="border-t border-border bg-surface-muted/30 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <span className="section-label">Who it's for</span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Tailored for every type of shared home
              </h2>
              <p className="mt-2 text-sm text-muted">
                Whether you are renting with best friends or living with newly met roommates.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {SCENARIOS.map((s) => (
                <div key={s.title} className="rounded-2xl border border-border bg-surface p-6 shadow-subtle">
                  <span className="rounded-md border border-border bg-surface-muted px-2.5 py-1 text-2xs font-semibold text-foreground">
                    {s.badge}
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────────────────────────── */}
        <section className="border-t border-border py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="text-center max-w-xl mx-auto">
              <span className="section-label">Roommate Stories</span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Trusted by flats across the country
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.author} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-subtle">
                  <p className="text-sm leading-relaxed text-foreground italic">
                    "{t.quote}"
                  </p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-foreground">{t.author}</p>
                    <p className="text-3xs text-muted">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-border bg-surface-muted/30 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="text-center">
              <span className="section-label">FAQ</span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-sm text-muted">
                Everything you need to know before inviting your flatmates.
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-border bg-surface p-6 shadow-subtle">
              {FAQ.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Clean Final Call to Action ────────────────────────────────────── */}
        <section className="mx-5 my-16 sm:mx-8">
          <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-surface p-8 text-center shadow-card sm:p-14">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary mx-auto mb-4">
              <Home className="h-6 w-6" />
            </span>

            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready for a simpler, drama-free shared home?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted sm:text-base">
              Set up your flat in 30 seconds. Start splitting expenses and tracking chores for free today.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button as={Link} to={primaryCta.to} size="lg" icon={ArrowRight} iconPosition="right" className="w-full sm:w-auto">
                {primaryCta.label}
              </Button>
              {!signedIn && (
                <Button as={Link} to="/login" variant="outline" size="lg" className="w-full sm:w-auto">
                  Sign in
                </Button>
              )}
            </div>

            <p className="mt-5 text-xs text-muted">
              Free forever &middot; No credit card required &middot; Instant setup
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Brand to="/" size="md" />
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">
                HouseHub is the modern operating system for shared living. Split bills fairly, manage apartment chores, and keep your house happy.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a></li>
                <li><a href="#scenarios" className="hover:text-foreground transition-colors">Use cases</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Account</p>
              <ul className="mt-3 space-y-2 text-xs text-muted">
                <li><Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
                <li><Link to="/register" className="hover:text-foreground transition-colors">Create account</Link></li>
                <li><Link to="/onboarding" className="hover:text-foreground transition-colors">Set up house</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted sm:flex-row">
            <p>&copy; {new Date().getFullYear()} HOUSEHUB. All rights reserved.</p>
            <p>Built for shared living and peaceful flats.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
