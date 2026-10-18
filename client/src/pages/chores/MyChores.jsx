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
  Trophy,
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
  Modal,
  PageHeader,
  SectionCard,
  SkeletonCards,
  SkeletonList,
  StatCard,
} from '@/components/ui';

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

  const { houseId } = useAuth();
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
      <div className="space-y-5">
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
      <div className="space-y-5">
        {header}
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!data) return <div className="space-y-5">{header}</div>;

  const { counts } = data;

  const sections = [
    { key: 'overdue', title: 'Overdue', chores: data.overdue, urgency: 'error' },
    { key: 'today', title: 'Due today', chores: data.today },
    { key: 'upcoming', title: 'Upcoming', chores: data.upcoming },
    { key: 'completed', title: 'Completed', chores: data.completed },
  ];

  return (
    <div className="space-y-5">
      {header}

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
        <div className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-soft p-3.5 text-sm text-error">
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
              description={section.key === 'completed' ? 'Recently wrapped up.' : undefined}
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

  return (
    <li
      className={cn(
        'rounded-xl border p-3.5 shadow-card',
        chore.isOverdue && !completed ? 'border-error/40 bg-error-soft/40' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/chores/${chore._id}`}
            className="block truncate text-sm font-medium text-foreground transition hover:text-primary hover:underline"
          >
            {chore.title}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <Badge tone={priority.tone} size="sm">
              {priority.label}
            </Badge>

            <span
              className={cn(
                'inline-flex items-center gap-1',
                chore.isOverdue && !completed ? 'font-medium text-error' : 'text-muted',
              )}
            >
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              {formatDueDate(chore.dueDate)}
            </span>

            <span className="tabular font-semibold text-gold">+{chore.xpReward} XP</span>
          </div>
        </div>

        {completed && (
          <Badge tone="success" size="sm">
            Done
          </Badge>
        )}
      </div>

      {completed ? (
        <p className="mt-2 text-xs text-muted">
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

/**
 * Turns a completion response into a toast and, when it is worth shouting
 * about, a celebration modal.
 */
function reportCompletion(result, toast, onCelebrate) {
  if (result.alreadyCompleted) {
    toast.info('This chore was already completed.');
    return;
  }

  const awarded = result.xp?.awarded;
  if (awarded) toast.success(`+${awarded} XP`);

  const achievements = result.newAchievements || [];
  if (result.unlockedLevel || achievements.length > 0) {
    onCelebrate({ level: result.unlockedLevel, achievements });
  }
}

/** Level-up and achievement fanfare shown after a successful completion. */
function ChoreCelebration({ celebration, onClose }) {
  const achievements = celebration?.achievements || [];
  const level = celebration?.level;

  return (
    <Modal
      open={Boolean(celebration)}
      onClose={onClose}
      size="sm"
      title={level ? `Level ${level} reached` : 'Achievement unlocked'}
      description={level ? 'Your XP crossed a level boundary.' : 'You unlocked something new.'}
      footer={
        <Button onClick={onClose} fullWidth>
          Nice
        </Button>
      }
    >
      <div className="space-y-3">
        {level && (
          <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">You are now level {level}</p>
          </div>
        )}

        {achievements.map((entry) => {
          // The API may send either the flat definition or `{ definition }`.
          const definition = entry.definition || entry;

          return (
            <div
              key={definition.code || definition.name}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/60 p-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg">
                {definition.icon ? (
                  <span aria-hidden="true">{definition.icon}</span>
                ) : (
                  <Trophy className="h-5 w-5 text-gold" aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{definition.name}</p>
                {definition.description && <p className="text-xs text-muted">{definition.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
