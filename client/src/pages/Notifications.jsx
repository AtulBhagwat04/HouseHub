import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Receipt,
  Trash2,
  UserPlus,
  XCircle,
  Zap,
} from 'lucide-react';
import * as notificationService from '@/services/notificationService';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { cn } from '@/lib/cn';
import { formatRelativeTime, titleCase } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SkeletonList,
  Tabs,
} from '@/components/ui';

const PAGE_SIZE = 20;

/**
 * One lookup for the whole notification vocabulary: the icon and the badge tone
 * for a type. Anything unrecognised falls back to a plain bell rather than
 * rendering nothing, so a new server-side type is never invisible.
 */
const NOTIFICATION_LOOKUP = {
  chore_assigned: { icon: ClipboardList, tone: 'primary' },
  chore_completed: { icon: CheckCircle2, tone: 'success' },
  chore_overdue: { icon: AlertTriangle, tone: 'error' },
  expense_added: { icon: Receipt, tone: 'primary' },
  settlement_requested: { icon: ArrowLeftRight, tone: 'warning' },
  settlement_confirmed: { icon: CheckCircle2, tone: 'success' },
  settlement_rejected: { icon: XCircle, tone: 'error' },
  settlement_reminder: { icon: BellRing, tone: 'warning' },
  achievement_unlocked: { icon: Award, tone: 'gold' },
  level_up: { icon: Zap, tone: 'gold' },
  member_joined: { icon: UserPlus, tone: 'primary' },
};

const FALLBACK_LOOKUP = { icon: Bell, tone: 'neutral' };

/** The bell: everything that happened to you, in one list. */
export default function Notifications() {
  useDocumentTitle('Notifications');

  const navigate = useNavigate();
  const toast = useToast();
  const { decrement, markAllRead, refreshUnread } = useNotifications();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);

  const { data, error, loading, refetch, setData } = useFetch(
    () => notificationService.listNotifications({ page, limit: PAGE_SIZE }),
    [page],
  );

  const [tab, setTab] = useState('all');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const items = data?.items || [];
  const meta = data?.meta;
  const visible = tab === 'unread' ? items.filter((item) => !item.read) : items;

  function goToPage(next) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
  }

  async function open(item) {
    if (!item.read) {
      try {
        await notificationService.markRead(item._id);
        decrement();
        setData((current) =>
          current
            ? { ...current, items: current.items.map((entry) => (entry._id === item._id ? { ...entry, read: true } : entry)) }
            : current,
        );
      } catch (error) {
        // The navigation below still matters more than the read receipt, so a
        // failed mark-read is reported but does not block the click.
        toast.fromError(error);
      }
    }

    if (item.link) navigate(item.link);
  }

  async function remove(item) {
    setDeletingId(item._id);
    try {
      await notificationService.removeNotification(item._id);
      await refetch();
      await refreshUnread();
      toast.success('Notification deleted');
    } catch (error) {
      toast.fromError(error);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllRead();
      await refetch();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.fromError(error);
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleClearRead() {
    setClearing(true);
    try {
      const deleted = await notificationService.clearRead();
      await refetch();
      await refreshUnread();
      setClearOpen(false);
      toast.success(deleted > 0 ? `Cleared ${deleted} read notifications` : 'Nothing to clear');
    } catch (error) {
      toast.fromError(error);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notifications' }]}
        title="Notifications"
        description="Chore, expense and settlement updates addressed to you."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              loading={markingAll}
              disabled={items.length === 0}
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              disabled={items.length === 0}
              onClick={() => setClearOpen(true)}
            >
              Clear read
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: 'All', count: meta?.total ?? items.length },
            { value: 'unread', label: 'Unread', count: meta?.unreadCount ?? 0 },
          ]}
        />
        <p className="text-2xs text-muted">
          The unread filter only narrows the notifications on this page. Use the pager to look further back.
        </p>
      </div>

      {loading ? (
        <Card>
          <SkeletonList rows={6} />
        </Card>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={BellRing}
            title="You are all caught up."
            description="Chore reminders, settlement requests and expense updates will land here."
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={CheckCheck}
            title="No unread notifications on this page"
            description="Switch back to All, or page through to find older ones."
            action={
              <Button variant="outline" size="sm" onClick={() => setTab('all')}>
                Show all
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((item) => {
            const lookup = NOTIFICATION_LOOKUP[item.type] || FALLBACK_LOOKUP;
            const Icon = lookup.icon;

            const content = (
              <>
                {item.actor ? (
                  <Avatar src={item.actor.avatarUrl} name={item.actor.name} size="md" />
                ) : (
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      lookup.tone === 'success' && 'bg-success-soft text-success',
                      lookup.tone === 'error' && 'bg-error-soft text-error',
                      lookup.tone === 'warning' && 'bg-warning-soft text-warning',
                      lookup.tone === 'gold' && 'bg-gold/15 text-gold',
                      (lookup.tone === 'primary' || lookup.tone === 'neutral') && 'bg-primary-soft text-primary',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} aria-hidden="true" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-foreground">{item.title}</p>
                    {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  </div>

                  {item.message && <p className="mt-0.5 text-sm text-muted">{item.message}</p>}

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={lookup.tone} size="sm">
                      {titleCase(item.type)}
                    </Badge>
                    <span className="text-2xs text-muted">{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>
              </>
            );

            return (
              <li
                key={item._id}
                className={cn(
                  'rounded-xl border shadow-card',
                  item.read ? 'border-border bg-surface' : 'border-primary/25 bg-primary-soft/40',
                )}
              >
                <div className="flex items-start gap-2 p-3.5">
                  {item.link ? (
                    // A real button, so keyboard users get the same click target as
                    // a mouse user and the row is announced as actionable.
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left transition hover:opacity-80"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={deletingId === item._id}
                    onClick={() => remove(item)}
                    aria-label={`Delete notification: ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && <Pagination meta={meta} onChange={goToPage} />}

      <ConfirmDialog
        open={clearOpen}
        loading={clearing}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClearRead}
        title="Clear read notifications?"
        description="Every notification you have already read is deleted. Unread ones are left alone."
        confirmLabel="Clear read"
      />
    </div>
  );
}
