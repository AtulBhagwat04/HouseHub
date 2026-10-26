import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  ListChecks,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import * as choreService from '@/services/choreService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDebounced, useDocumentTitle, useFetch } from '@/hooks';
import { CHORE_PRIORITIES, PRIORITY_STYLES, STATUS_STYLES } from '@/lib/catalogue';
import { cn } from '@/lib/cn';
import { formatDueDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dropdown,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Tabs,
  UserChip,
} from '@/components/ui';
import ChoreCelebration, { reportCompletion } from './ChoreCelebration';

const PAGE_SIZE = 20;
const DEFAULT_SORT = 'dueDate:asc';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'dueDate:asc', label: 'Due date (soonest)' },
  { value: 'dueDate:desc', label: 'Due date (latest)' },
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'priority:desc', label: 'Priority (high first)' },
  { value: 'priority:asc', label: 'Priority (low first)' },
  { value: 'title:asc', label: 'Title (A-Z)' },
];

/**
 * The chore board.
 *
 * Filters live in the URL so a filtered view can be bookmarked or shared, and
 * every filter change resets to page 1 - otherwise you can narrow the list to
 * three results while sitting on page 4 and be shown an empty table.
 *
 * The status tab counts come from the server's meta rather than the current
 * page of rows, so they stay honest while paging.
 */
export default function Chores() {
  useDocumentTitle('Chores');

  const { houseId, user, isManager } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    page: Number(searchParams.get('page')) || 1,
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    assignedTo: searchParams.get('assignedTo') || '',
    q: searchParams.get('q') || '',
    sort: searchParams.get('sort') || DEFAULT_SORT,
  };

  const [searchInput, setSearchInput] = useState(filters.q);
  const debouncedSearch = useDebounced(searchInput, 300);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [celebration, setCelebration] = useState(null);

  const { data, error, loading, refetch } = useFetch(
    () =>
      choreService.listChores(houseId, {
        page: filters.page,
        limit: PAGE_SIZE,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.assignedTo ? { assignedTo: filters.assignedTo } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        sort: filters.sort,
      }),
    [houseId, filters.page, filters.status, filters.priority, filters.assignedTo, filters.q, filters.sort],
  );

  // The assignee filter needs member names. This request is small and does not
  // need to gate the chore list, so it runs alongside it.
  const { data: memberData } = useFetch(() => houseService.fetchMembers(houseId), [houseId]);
  const members = memberData?.members || [];

  const rows = data?.items || [];
  const meta = data?.meta;

  // Push the debounced search term into the URL. Comparing against the current
  // param first avoids fighting an externally cleared search box.
  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (debouncedSearch === current) return;

    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) params.set('q', debouncedSearch);
    else params.delete('q');
    params.delete('page');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function applyFilters(patch) {
    const next = { ...filters, ...patch };
    const params = {};

    if (next.page > 1) params.page = String(next.page);
    if (next.status) params.status = next.status;
    if (next.priority) params.priority = next.priority;
    if (next.assignedTo) params.assignedTo = next.assignedTo;
    if (next.q) params.q = next.q;
    if (next.sort && next.sort !== DEFAULT_SORT) params.sort = next.sort;

    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  }

  const hasFilters = Boolean(filters.status || filters.priority || filters.assignedTo || filters.q);

  const isAssignee = (chore) => idOf(chore.assignedTo) === user?._id;
  const canManage = (chore) => idOf(chore.createdBy) === user?._id || isManager;

  async function handleStart(chore) {
    try {
      await choreService.startChore(houseId, chore._id);
      toast.success('Chore started');
      refetch();
    } catch (error) {
      toast.fromError(error);
    }
  }

  async function handleComplete(chore) {
    try {
      const result = await choreService.completeChore(houseId, chore._id);
      reportCompletion(result, toast, setCelebration);
      refetch();
    } catch (error) {
      toast.fromError(error);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await choreService.deleteChore(houseId, pendingDelete._id);
      toast.success('Chore deleted');
      setPendingDelete(null);
      refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setDeleting(false);
    }
  }

  const tabs = STATUS_TABS.map((tab) => {
    let count;

    if (tab.value === 'all') count = meta?.total;
    else if (tab.value === 'overdue') count = meta?.counts?.overdue;
    else if (tab.value === 'completed') count = meta?.counts?.completed;

    return { ...tab, count };
  });

  function rowActions(row) {
    const items = [{ label: 'View', icon: Eye, to: `/chores/${row._id}` }];

    if (isAssignee(row) && row.status === 'pending') {
      items.push({ label: 'Start', icon: Play, onClick: () => handleStart(row) });
    }

    if (row.status !== 'completed' && (isAssignee(row) || isManager)) {
      items.push({ label: 'Mark complete', icon: CheckCircle2, onClick: () => handleComplete(row) });
    }

    if (canManage(row)) {
      items.push({ separator: true });
      items.push({ label: 'Edit', icon: Pencil, to: `/chores/${row._id}/edit` });
      items.push({ label: 'Delete', icon: Trash2, danger: true, onClick: () => setPendingDelete(row) });
    }

    return items;
  }

  const columns = [
    {
      key: 'chore',
      header: 'Chore',
      mobilePrimary: true,
      cell: (row) => {
        const priority = PRIORITY_STYLES[row.priority] || PRIORITY_STYLES.medium;
        const overdue = row.derivedStatus === 'overdue';

        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/chores/${row._id}`}
                className="truncate text-sm font-medium text-foreground transition hover:text-primary hover:underline"
              >
                {row.title}
              </Link>
              <Badge tone={priority.tone} size="sm">
                {priority.label}
              </Badge>
            </div>

            {/* The dedicated Due column is dropped on phones, so the due date
                rides along under the title instead. */}
            <p
              className={cn(
                'mt-1 flex items-center gap-1.5 text-xs sm:hidden',
                overdue ? 'font-semibold text-error' : 'text-muted',
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              ) : (
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
              )}
              {formatDueDate(row.dueDate)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'assignedTo',
      header: 'Assigned to',
      mobileLabel: 'Assigned to',
      cell: (row) =>
        typeof row.assignedTo === 'string' ? (
          <span className="text-sm text-muted">Former member</span>
        ) : (
          <UserChip user={row.assignedTo} />
        ),
    },
    {
      key: 'due',
      header: 'Due',
      mobileHidden: true,
      cell: (row) =>
        row.derivedStatus === 'overdue' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-error">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDueDate(row.dueDate)}
          </span>
        ) : (
          <span className="text-sm text-muted">{formatDueDate(row.dueDate)}</span>
        ),
    },
    {
      key: 'xp',
      header: 'XP',
      align: 'right',
      mobileLabel: 'Reward',
      cell: (row) => (
        <Badge tone="gold" size="sm" icon={Zap} className="tabular">
          +{row.xpReward} XP
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: (row) => {
        const style = STATUS_STYLES[row.derivedStatus] || STATUS_STYLES.pending;

        return (
          <Badge tone={style.tone} size="sm" dot>
            {style.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobileTrailing: true,
      cell: (row) => (
        <Dropdown
          align="right"
          trigger={
            <Button variant="ghost" size="icon" aria-label={`Actions for ${row.title}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
          items={rowActions(row)}
        />
      ),
    },
  ];

  const emptyState = hasFilters ? (
    <EmptyState
      icon={Search}
      title="No chores match those filters"
      description="Try a different status, priority or search term."
      action={
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={ClipboardList}
      title="No chores yet"
      description="Add the first chore so shared work does not land on one person."
      action={
        <Button as={Link} to="/chores/new" size="sm" icon={Plus}>
          Add chore
        </Button>
      }
    />
  );

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        title="Chores"
        description="Everything the house has to get done, and who is on it."
        actions={
          <>
            <Button as={Link} to="/chores/mine" variant="outline" size="sm" icon={ListChecks}>
              My chores
            </Button>
            <Button as={Link} to="/chores/new" size="sm" icon={Plus}>
              New chore
            </Button>
          </>
        }
      />

      <div className="space-y-3">
        <Tabs
          value={filters.status || 'all'}
          onChange={(value) => applyFilters({ status: value === 'all' ? '' : value, page: 1 })}
          tabs={tabs}
        />

        <Card className="space-y-3">
          <Input
            icon={Search}
            size="sm"
            placeholder="Search chores"
            aria-label="Search chores"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              size="sm"
              aria-label="Filter by priority"
              value={filters.priority}
              onChange={(event) => applyFilters({ priority: event.target.value, page: 1 })}
              options={[
                { value: '', label: 'All priorities' },
                ...CHORE_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: PRIORITY_STYLES[priority]?.label || priority,
                })),
              ]}
            />

            <Select
              size="sm"
              aria-label="Filter by assignee"
              value={filters.assignedTo}
              onChange={(event) => applyFilters({ assignedTo: event.target.value, page: 1 })}
              options={[
                { value: '', label: 'Everyone' },
                ...members.map((member) => ({ value: member._id, label: member.name })),
              ]}
            />

            <Select
              size="sm"
              aria-label="Sort chores"
              value={filters.sort}
              onChange={(event) => applyFilters({ sort: event.target.value, page: 1 })}
              options={SORT_OPTIONS}
            />
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </Card>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            loading={loading}
            emptyState={emptyState}
            // No outer card on phones - the stacked rows already look like
            // cards, and nesting them would double up the borders. Overdue
            // rows get an error wash so they read as urgent, not just labelled.
            rowClassName={(row) =>
              cn(
                'transition-shadow',
                row.derivedStatus === 'overdue'
                  ? 'bg-error-soft/40'
                  : 'hover:shadow-raised sm:hover:shadow-none',
              )
            }
            className="sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-4 sm:shadow-card"
          />

          <Pagination meta={meta} onChange={(page) => applyFilters({ page })} itemLabel="chore" className="px-1" />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete this chore?"
        description={pendingDelete ? `"${pendingDelete.title}" will be removed for everyone in the house.` : undefined}
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
