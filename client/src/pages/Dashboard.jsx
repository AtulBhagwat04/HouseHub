import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Plus,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import {
  categoryColor,
  categoryMeta,
  PRIORITY_STYLES,
  STATUS_STYLES,
} from '@/lib/catalogue';
import { formatCurrency, formatDueDate, formatRelativeTime, pluralise } from '@/lib/format';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import ProgressBar from '@/components/ui/ProgressBar';
import { Card, SectionCard, StatCard } from '@/components/ui/Card';
import { SkeletonCards, SkeletonList } from '@/components/ui/Skeleton';
import Avatar from '@/components/ui/Avatar';
import Money from '@/components/ui/Money';
import XpBadge from '@/components/ui/XpBadge';
import InviteCard from '@/components/InviteCard';

/**
 * The dashboard.
 *
 * One request (`GET /houses/:id/dashboard`) returns everything on this screen,
 * which is why it can run on a cold load without a waterfall of six spinners.
 * Every money figure comes from the server already in paise; nothing is
 * recomputed here, so the dashboard can never disagree with the expenses page.
 */
export default function Dashboard() {
  useDocumentTitle('Dashboard');

  const { houseId, house, user } = useAuth();
  const { data, error, loading, refetch } = useFetch(() => houseService.fetchDashboard(houseId), [houseId]);

  // Only fetch the invite details when the house is still empty - a house with
  // housemates does not need the invite banner on the dashboard.
  const { data: invite } = useFetch(
    () => (data && data.totalMembers <= 1 ? houseService.fetchInvite(houseId) : Promise.resolve(null)),
    [houseId, data?.totalMembers],
    { immediate: Boolean(data) },
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-muted" />
        <SkeletonCards count={4} />
        <Card>
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { financials, chores, xp, rank, totalMembers, leaderboardTop, upcomingChores, recentExpenses, recentActivity, members } = data;

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-5 page-stagger">
      {/* Header ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Hi {firstName} <span aria-hidden="true">👋</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Here is what is happening in {house?.name || 'your house'}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/expenses/new" icon={Plus} size="sm">
            Add expense
          </Button>
          <Button as={Link} to="/chores/new" variant="outline" icon={Plus} size="sm">
            Add chore
          </Button>
        </div>
      </div>

      {/* Money ----------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="House total"
          value={formatCurrency(financials.totalHouseExpenses)}
          sub={`${pluralise(members.length, 'member')} sharing`}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label={<span className={financials.youOwe > 0 ? 'text-error' : undefined}>You owe</span>}
          value={formatCurrency(financials.youOwe)}
          sub={
            financials.youOweTo.length > 0
              ? `to ${financials.youOweTo.map((entry) => nameOf(members, entry.to)).join(', ')}`
              : 'nothing outstanding'
          }
          icon={ArrowUpRight}
          tone={financials.youOwe > 0 ? 'error' : 'default'}
        />
        <StatCard
          label={<span className={financials.youAreOwed > 0 ? 'text-success' : undefined}>You are owed</span>}
          value={formatCurrency(financials.youAreOwed)}
          sub={
            financials.owedToYouBy.length > 0
              ? `by ${financials.owedToYouBy.map((entry) => nameOf(members, entry.from)).join(', ')}`
              : 'nothing outstanding'
          }
          icon={TrendingUp}
          tone={financials.youAreOwed > 0 ? 'success' : 'default'}
        />
        <StatCard
          label="Net balance"
          value={<Money paise={financials.netBalance} signed />}
          sub={financials.netBalance >= 0 ? 'in your favour' : 'you are behind'}
          icon={Wallet}
          tone={financials.netBalance > 0 ? 'success' : financials.netBalance < 0 ? 'error' : 'default'}
        />
      </div>

      {/* Invite ---------------------------------------------------------- */}
      {totalMembers <= 1 && invite && (
        <InviteCard
          houseId={houseId}
          inviteCode={invite.inviteCode}
          inviteLink={invite.inviteLink}
          allowInvites={invite.allowInvites}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column ------------------------------------------------- */}
        <div className="space-y-5 lg:col-span-2">
          {/* Your progress */}
          <SectionCard
            title="Your progress"
            action={
              <Button as={Link} to="/leaderboard" variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                Leaderboard
              </Button>
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <XpBadge xp={xp.totalXp} level={xp.level} variant="full" className="flex-1" />

              <div className="flex shrink-0 gap-3 sm:flex-col sm:gap-2">
                <Badge tone={rank === 1 ? 'gold' : 'primary'} size="md">
                  Rank #{rank ?? '--'} of {totalMembers}
                </Badge>
                <Badge tone="neutral" size="md">
                  {pluralise(chores.myCompleted, 'chore')} done
                </Badge>
              </div>
            </div>
          </SectionCard>

          {/* My chores */}
          <SectionCard
            title="Your chores"
            description="Everything assigned to you that is still open."
            action={
              <Button as={Link} to="/chores/mine" variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                View all
              </Button>
            }
          >
            {upcomingChores.length === 0 ? (
              <EmptyState
                compact
                icon={CheckCircle2}
                title="Nothing assigned to you"
                description="Either you are very lucky, or nobody has added chores yet."
                action={
                  <Button as={Link} to="/chores/new" size="sm" variant="outline" icon={Plus}>
                    Add a chore
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcomingChores.map((chore) => {
                  const style = STATUS_STYLES[chore.derivedStatus] || STATUS_STYLES.pending;
                  const priority = PRIORITY_STYLES[chore.priority] || PRIORITY_STYLES.medium;
                  const overdue = chore.isOverdue;

                  return (
                    <li key={chore._id}>
                      <Link
                        to={`/chores/${chore._id}`}
                        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-primary/[0.04]"
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            overdue ? 'bg-error-soft text-error' : 'bg-primary-soft text-primary'
                          }`}
                        >
                          <ClipboardList className="h-4 w-4" aria-hidden="true" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{chore.title}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <CalendarClock className="h-3 w-3" aria-hidden="true" />
                            {formatDueDate(chore.dueDate)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge tone={priority.tone} size="sm">
                            {priority.label}
                          </Badge>
                          <Badge tone={style.tone} size="sm">
                            {style.label}
                          </Badge>
                          <span className="tabular hidden text-xs font-semibold text-gold sm:block">
                            +{chore.xpReward} XP
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* Recent expenses */}
          <SectionCard
            title="Recent expenses"
            action={
              <Button as={Link} to="/expenses" variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                View all
              </Button>
            }
          >
            {recentExpenses.length === 0 ? (
              <EmptyState
                compact
                icon={Receipt}
                title="No expenses yet"
                description="Add the first bill and HOUSEHUB will work out who owes what."
                action={
                  <Button as={Link} to="/expenses/new" size="sm" variant="outline" icon={Plus}>
                    Add expense
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentExpenses.map((expense) => {
                  const meta = categoryMeta(expense.category);
                  const color = categoryColor(expense.category);

                  return (
                    <li key={expense._id}>
                      <Link
                        to={`/expenses/${expense._id}`}
                        className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-primary/[0.04]"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                          style={{ backgroundColor: `${color}1f` }}
                          aria-hidden="true"
                        >
                          {meta.emoji}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {expense.paidBy} paid &middot; {meta.label} &middot; {formatRelativeTime(expense.date)}
                          </p>
                        </div>

                        <span className="tabular shrink-0 text-sm font-semibold text-foreground">
                          {formatCurrency(expense.amount)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Right column ------------------------------------------------ */}
        <div className="space-y-5">
          {/* House chores */}
          <SectionCard title="House chores">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Open" value={chores.houseOpen} />
              <MiniStat label="Overdue" value={chores.houseOverdue} tone={chores.houseOverdue > 0 ? 'error' : 'default'} />
              <MiniStat label="Done" value={chores.houseCompleted} tone="success" />
            </div>

            <div className="mt-4">
              <ProgressBar
                value={chores.weeklyGoal.progress}
                tone="success"
                size="sm"
                label={`${chores.weeklyGoal.completed} of ${chores.weeklyGoal.target} chores completed this week`}
                showValue
              />
            </div>

            <Button as={Link} to="/chores" variant="outline" size="sm" fullWidth className="mt-4">
              Open chore board
            </Button>
          </SectionCard>

          {/* Leaderboard snapshot */}
          <SectionCard
            title="Top of the house"
            action={
              <Button as={Link} to="/leaderboard" variant="ghost" size="sm">
                All
              </Button>
            }
          >
            <ol className="space-y-2.5">
              {leaderboardTop.map((entry) => (
                <li key={entry._id} className="flex items-center gap-3">
                  <span
                    className={`tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      entry.rank === 1
                        ? 'bg-gold/20 text-gold'
                        : entry.rank === 2
                          ? 'bg-surface-muted text-muted'
                          : 'bg-warning-soft text-warning'
                    }`}
                  >
                    {entry.rank}
                  </span>

                  <Avatar src={entry.avatarUrl} name={entry.name} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entry.name}
                      {entry._id === user?._id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                    </p>
                    <p className="text-2xs text-muted">
                      Lv {entry.level} &middot; {pluralise(entry.choresCompleted, 'chore')}
                    </p>
                  </div>

                  <span className="tabular shrink-0 text-xs font-semibold text-gold">{entry.xp} XP</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Recent activity */}
          <SectionCard
            title="Recent activity"
            action={
              <Button as={Link} to="/activity" variant="ghost" size="sm">
                All
              </Button>
            }
          >
            {recentActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nothing has happened yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((entry) => (
                  <li key={entry._id} className="flex gap-2.5">
                    <Avatar src={entry.actor?.avatarUrl} name={entry.actor?.name || 'Someone'} size="xs" className="mt-0.5" />

                    <div className="min-w-0">
                      <p className="text-xs leading-snug text-foreground">
                        <span className="font-medium">{entry.actor?.name || 'Someone'}</span> {entry.message}
                      </p>
                      <p className="mt-0.5 text-2xs text-muted">{formatRelativeTime(entry.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Quick links">
            <div className="grid grid-cols-2 gap-2">
              <QuickLink to="/balances" icon={Wallet} label="Balances" />
              <QuickLink to="/settlements" icon={TrendingUp} label="Settle up" />
              <QuickLink to="/house/members" icon={Users} label="Members" />
              <QuickLink to="/achievements" icon={CheckCircle2} label="Achievements" />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Local presentation helpers                                                  */
/* -------------------------------------------------------------------------- */

/** The dashboard returns user ids inside the owe/owed lists, not names. */
function nameOf(members, id) {
  const match = members.find((member) => member._id === id);
  if (!match) return 'someone';
  return match.name.split(' ')[0];
}

function MiniStat({ label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'text-foreground',
    error: 'text-error',
    success: 'text-success',
  };

  return (
    <div className="rounded-xl border border-border bg-surface-muted/60 p-2.5 text-center">
      <p className={`tabular font-display text-lg font-semibold ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-0.5 text-2xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex min-h-9 items-center gap-2 rounded-xl border border-border bg-surface-muted/40 px-3 py-2.5 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.04] active:scale-[0.98]"
    >
      <Icon className="h-4 w-4 shrink-0 text-primary transition group-hover:scale-110" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
