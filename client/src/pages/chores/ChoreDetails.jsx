import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Flag,
  Pencil,
  Play,
  Plus,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react';
import * as choreService from '@/services/choreService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { PRIORITY_STYLES, STATUS_STYLES } from '@/lib/catalogue';
import { cn } from '@/lib/cn';
import { formatDateTime, formatDueDate, formatRelativeTime } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  SectionCard,
  Skeleton,
  UserChip,
} from '@/components/ui';
import ChoreCelebration, { reportCompletion } from './ChoreCelebration';

/**
 * A single chore.
 *
 * Two things this page is careful about:
 *   - Completion is a server round trip through `completeChore` with no body.
 *     XP is read from the stored chore, so the UI cannot inflate it.
 *   - The XP callout names the assignee explicitly, because the common
 *     misunderstanding is that the person who ticks it off earns the points.
 */
export default function ChoreDetails() {
  const { choreId } = useParams();
  const { houseId, user, isManager } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: chore, error, loading, refetch } = useFetch(
    () => choreService.getChore(houseId, choreId),
    [houseId, choreId],
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(null);

  useDocumentTitle(chore ? chore.title : 'Chore');

  async function start() {
    setBusy(true);
    try {
      await choreService.startChore(houseId, choreId);
      toast.success('Chore started');
      refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    try {
      const result = await choreService.completeChore(houseId, choreId);
      reportCompletion(result, toast, setCelebration);
      refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await choreService.deleteChore(houseId, choreId);
      toast.success('Chore deleted');
      navigate('/chores');
    } catch (error) {
      toast.fromError(error);
    } finally {
      setDeleting(false);
    }
  }

  const title = chore ? chore.title : 'Chore';
  const subtitle = chore
    ? `Added ${formatRelativeTime(chore.createdAt)} by ${nameOf(chore.createdBy)}`
    : undefined;
  const header = <PageHeader title={title} description={subtitle} backTo="/chores" />;

  if (loading) {
    return (
      <div className="page-stagger space-y-5">
        {header}
        <Card className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
        <Card className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </Card>
      </div>
    );
  }

  // 403 and 404 come back with a message written for the user, so ErrorState
  // can show it as-is.
  if (error) {
    return (
      <div className="page-stagger space-y-5">
        {header}
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!chore) return <div className="page-stagger space-y-5">{header}</div>;

  const status = STATUS_STYLES[chore.derivedStatus] || STATUS_STYLES.pending;
  const priority = PRIORITY_STYLES[chore.priority] || PRIORITY_STYLES.medium;
  const isAssignee = idOf(chore.assignedTo) === user?._id;
  const canManage = idOf(chore.createdBy) === user?._id || isManager;
  const completed = chore.status === 'completed';
  const canComplete = !completed && (isAssignee || isManager);
  const canStart = !completed && isAssignee && chore.status === 'pending';
  const assigneeName = nameOf(chore.assignedTo);
  const overdue = chore.isOverdue && !completed;

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        title={title}
        description={subtitle}
        backTo="/chores"
        actions={
          <>
            {canComplete && (
              <Button icon={CheckCircle2} onClick={complete} loading={busy}>
                Mark complete
              </Button>
            )}

            {canStart && (
              <Button variant="outline" icon={Play} onClick={start} disabled={busy}>
                Start chore
              </Button>
            )}

            {canManage && (
              <Button as={Link} to={`/chores/${choreId}/edit`} variant="outline" icon={Pencil}>
                Edit
              </Button>
            )}

            {canManage && (
              <Button variant="ghost" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            )}
          </>
        }
      >
        {/* Difficulty, reward and due state sit under the title so the first
            thing on the page is what this is worth and how late it is. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>

          <Badge tone={priority.tone} size="md" icon={Flag}>
            {priority.label}
          </Badge>

          <Badge tone="gold" size="md" icon={Zap} className="tabular">
            +{chore.xpReward} XP
          </Badge>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-sm',
              overdue ? 'font-semibold text-error' : 'text-muted',
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDueDate(chore.dueDate)}
          </span>
        </div>
      </PageHeader>

      {overdue && (
        <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-error/40 bg-error-soft p-4 text-sm text-error shadow-card">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-error" />
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            This chore was due {formatDueDate(chore.dueDate)} and is now overdue.
            {isAssignee ? ' It is assigned to you.' : ` It is assigned to ${assigneeName}.`}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Details">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Status">
                <Badge tone={status.tone} dot>
                  {status.label}
                </Badge>
              </Fact>

              <Fact label="Priority">
                <Badge tone={priority.tone} icon={Flag}>
                  {priority.label}
                </Badge>
              </Fact>

              <Fact label="Worth">
                <Badge tone="gold" size="md" icon={Zap} className="tabular">
                  +{chore.xpReward} XP
                </Badge>
              </Fact>

              <Fact label="Due">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    overdue ? 'font-semibold text-error' : 'text-foreground',
                  )}
                >
                  {overdue ? (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {formatDueDate(chore.dueDate)}
                </span>
              </Fact>

              <Fact label="Completed">
                <span className="text-foreground">{completed ? formatDateTime(chore.completedAt) : 'Not yet'}</span>
              </Fact>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-2xs font-medium uppercase tracking-wide text-muted">Description</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {chore.description || 'No description was added for this chore.'}
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Timeline">
            <ol className="space-y-4">
              <TimelineRow
                icon={Plus}
                tone="primary"
                title="Created"
                detail={`${nameOf(chore.createdBy)} \u00b7 ${formatDateTime(chore.createdAt)}`}
              />

              <TimelineRow
                icon={Play}
                tone={chore.startedAt ? 'primary' : 'neutral'}
                title="Started"
                detail={chore.startedAt ? formatDateTime(chore.startedAt) : 'Not started yet'}
              />

              <TimelineRow
                icon={CheckCircle2}
                tone={completed ? 'success' : 'neutral'}
                title="Completed"
                detail={
                  completed
                    ? `${nameOf(chore.completedBy)} \u00b7 ${formatDateTime(chore.completedAt)}`
                    : 'Not completed yet'
                }
              />
            </ol>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Assigned to">
            {typeof chore.assignedTo === 'string' ? (
              <p className="text-sm text-muted">This chore is no longer assigned to a current member.</p>
            ) : (
              <UserChip user={chore.assignedTo} size="md" subtitle={`Lv ${chore.assignedTo.level}`} />
            )}

            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2.5">
                <UserRound className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-2xs uppercase tracking-wide text-muted">Created by</p>
                  <p className="truncate text-sm text-foreground">{nameOf(chore.createdBy)}</p>
                </div>
              </div>

              {completed && (
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-2xs uppercase tracking-wide text-muted">Completed by</p>
                    <p className="truncate text-sm text-foreground">{nameOf(chore.completedBy)}</p>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <Card className="relative overflow-hidden">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-gold/15 blur-3xl"
            />

            <div className="relative flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-gold text-white shadow-glow-gold">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-foreground">Worth +{chore.xpReward} XP</p>
                <p className="mt-0.5 text-xs text-muted">
                  The XP is credited to {assigneeName} when this is marked complete - not to whoever ticks it off.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this chore?"
        description={`"${chore.title}" will be removed for everyone in the house.`}
        confirmLabel="Delete chore"
      />

      <ChoreCelebration celebration={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Local helpers                                                              */
/* -------------------------------------------------------------------------- */

/** `createdBy` / `assignedTo` arrive either populated (an object) or as an id. */
function idOf(value) {
  return typeof value === 'string' ? value : value?._id || null;
}

function nameOf(value) {
  if (!value) return 'a housemate';
  return typeof value === 'string' ? 'a housemate' : value.name;
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function TimelineRow({ icon: Icon, title, detail, tone = 'neutral' }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success',
    neutral: 'bg-surface-muted text-muted',
  };

  return (
    <li className="flex items-start gap-3">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tones[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted">{detail}</p>
      </div>
    </li>
  );
}
