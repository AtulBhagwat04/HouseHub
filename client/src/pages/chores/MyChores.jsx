import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Plus,
  Zap,
} from 'lucide-react';
import * as choreService from '@/services/choreService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { PRIORITY_STYLES } from '@/lib/catalogue';
import { cn } from '@/lib/cn';
import { formatDateTime, formatDueDate, pluralise } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionCard,
  SkeletonCards,
  SkeletonList,
  StatCard,
  XpBadge,
} from '@/components/ui';
import ChoreCelebration, { reportCompletion } from './ChoreCelebration';

/**
 * My chores.
 *
 * The server already buckets the chores into overdue / today / upcoming /
 * completed, so this page never re-derives "is this late?" - the same answer
 * cannot disagree between here and the board.
 *
 * Completion refetches rather than shuffling arrays locally: the buckets are
 * the server's opinion, and a stale local copy is how My Chores and the board
 * start disagreeing about what is done.
 */
export default function MyChores() {
  useDocumentTitle('My chores');

  const { houseId, user } = useAuth();
  const toast = useToast();

  const { data, error, loading, refetch } = useFetch(() => choreService.getMyChores(houseId), [houseId]);
  const [celebration, setCelebration] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function complete(chore) {
    setBusyId(chore._id);
    try {
      const result = await choreService.completeChore(houseId, chore._id);
      reportCompletion(result, toast, setCelebration);
      refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusyId(null);
    }
  }

  const header = (
    <PageHeader
      title="My chores"
      description="Everything assigned to you, ordered by what is most pressing."
      actions={
        <>
          <Button as={Link} to="/chores" variant="outline" size="sm" icon={ClipboardList}>
            All chores
          </Button>
          <Button as={Link} to="/chores/new" size="sm" icon={Plus}>
            Add chore
          </Button>
        </>
      }
    />
  );

  if (loading) {
    return (
      <div className="page-stagger space-y-5">
        {header}
        <SkeletonCards count={4} />
        <Card>
          <SkeletonList rows={4} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stagger space-y-5">
        {header}
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!data) return <div className="page-stagger space-y-5">{header}</div>;

  const { counts } = data;

  const sections = [
    { key: 'overdue', title: 'Overdue', chores: data.overdue, urgency: 'error' },
    { key: 'today', title: 'Due today', chores: data.today },
    { key: 'upcoming', title: 'Upcoming', chores: data.upcoming },
    { key: 'completed', title: 'Completed', chores: data.completed },
  ];

  return (
    <div className="page-stagger space-y-5">
      {header}

      {/* The personal half of the gamification: the same level bar shown on the
          dashboard, so the numbers agree wherever they appear. */}
      <Card className="relative overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <XpBadge xp={user?.xp} level={user?.level} variant="full" className="sm:flex-1" />

          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge tone="success" size="md">
              {pluralise(counts.completed, 'chore')} done
            </Badge>
            <Badge tone={counts.overdue > 0 ? 'error' : 'neutral'} size="md">
              {pluralise(counts.overdue, 'chore')} overdue
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overdue"
          value={counts.overdue}
          sub={counts.overdue > 0 ? 'needs attention first' : 'nothing late'}
          icon={AlertTriangle}
          tone={counts.overdue > 0 ? 'error' : 'default'}
        />
        <StatCard label="Due today" value={counts.today} sub="finish these today" icon={CalendarClock} tone="warning" />
        <StatCard label="Upcoming" value={counts.upcoming} sub="later this month" icon={CalendarDays} tone="primary" />
        <StatCard label="Completed" value={counts.completed} sub="done and dusted" icon={CheckCircle2} tone="success" />
      </div>

      {counts.overdue > 0 && (
        <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-error/40 bg-error-soft p-4 text-sm text-error shadow-card">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-error" />
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            {pluralise(counts.overdue, 'chore')} past the due date. Clear those first - the house is waiting on them.
          </p>
        </div>
      )}

      {counts.total === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title="Nothing assigned to you"
            description="Either you are very lucky, or nobody has added chores yet."
            action={
              <Button as={Link} to="/chores/new" size="sm" icon={Plus}>
                Add a chore
              </Button>
            }
          />
        </Card>
      ) : (
        sections
          .filter((section) => section.chores.length > 0)
          .map((section) => (
            <SectionCard
              key={section.key}
              title={section.title}
              action={
                section.urgency === 'error' ? (
                  <Badge tone="error" size="sm" dot>
                    Action needed
                  </Badge>
                ) : undefined
              }
            >
              <ul className="space-y-2.5">
                {section.chores.map((chore) => (
                  <ChoreCard
                    key={chore._id}
                    chore={chore}
                    completed={section.key === 'completed'}
                    busy={busyId === chore._id}
                    onComplete={() => complete(chore)}
                  />
                ))}
              </ul>
            </SectionCard>
          ))
      )}

      <ChoreCelebration celebration={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Local helpers                                                              */
/* -------------------------------------------------------------------------- */

/** One actionable chore row. Kept as a card rather than a table row because
 *  these are things you act on, not things you compare. */
function ChoreCard({ chore, completed, busy, onComplete }) {
  const priority = PRIORITY_STYLES[chore.priority] || PRIORITY_STYLES.medium;
  const overdue = chore.isOverdue && !completed;

  return (
    <li
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 shadow-card transition',
        overdue
          ? 'border-error/40 bg-error-soft/40'
          : 'border-border bg-surface hover:border-border/80 hover:shadow-raised',
      )}
    >
      {overdue && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-error" />}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/chores/${chore._id}`}
            className="block truncate text-sm font-medium text-foreground transition hover:text-primary hover:underline"
          >
            {chore.title}
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={priority.tone} size="sm">
              {priority.label}
            </Badge>

            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                overdue ? 'font-semibold text-error' : 'text-muted',
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
              )}
              {formatDueDate(chore.dueDate)}
            </span>

            <Badge tone="gold" size="sm" icon={Zap} className="tabular">
              +{chore.xpReward} XP
            </Badge>
          </div>
        </div>

        {completed && (
          <Badge tone="success" size="sm">
            Done
          </Badge>
        )}
      </div>

      {completed ? (
        <p className="mt-2.5 text-xs text-muted">
          Completed by {nameOf(chore.completedBy)}
          {chore.completedAt ? ` on ${formatDateTime(chore.completedAt)}` : ''}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="success" icon={CheckCircle2} onClick={onComplete} loading={busy}>
            Mark complete
          </Button>
          <Button as={Link} to={`/chores/${chore._id}`} size="sm" variant="outline">
            Open
          </Button>
        </div>
      )}
    </li>
  );
}

/** `completedBy` is usually populated, but fall back to something human. */
function nameOf(value) {
  if (!value) return 'a housemate';
  return typeof value === 'string' ? 'a housemate' : value.name;
}
