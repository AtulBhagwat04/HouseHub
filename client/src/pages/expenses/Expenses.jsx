import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Eye,
  Hash,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import * as expenseService from '@/services/expenseService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDebounced, useDocumentTitle, useFetch } from '@/hooks';
import { EXPENSE_CATEGORIES, SPLIT_TYPE_LABELS, categoryLabel } from '@/lib/catalogue';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import {
  Badge,
  Button,
  CategoryIcon,
  ConfirmDialog,
  DataTable,
  Dropdown,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  SectionCard,
  Select,
  SkeletonCards,
  StatCard,
  UserChip,
} from '@/components/ui';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Highest amount' },
  { value: 'amount:asc', label: 'Lowest amount' },
  { value: 'title:asc', label: 'Title A-Z' },
];

const FILTER_KEYS = ['q', 'category', 'member', 'from', 'to'];

/** A populated reference serialises as an object; an unpopulated one as an id. */
function idOf(value) {
  return typeof value === 'object' && value !== null ? value._id : value;
}

/** Turn the URL search params into the API's query shape. */
function readParams(searchParams) {
  const params = { page: Number(searchParams.get('page')) || 1, limit: PAGE_SIZE };
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) params[key] = value;
  }
  const sort = searchParams.get('sort');
  if (sort) params.sort = sort;
  return params;
}

/**
 * The expenses ledger.
 *
 * Every filter lives in the URL so a filtered view can be bookmarked, shared and
 * survives a refresh. Any filter change resets to page 1, because being on page
 * 4 of a newly-filtered list is almost always an empty page and looks broken.
 */
export default function Expenses() {
  useDocumentTitle('Expenses');

  const { houseId, user, isManager } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryString = searchParams.toString();
  const urlQuery = searchParams.get('q') || '';

  const [search, setSearch] = useState(urlQuery);
  const debouncedSearch = useDebounced(search, 300);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Push the debounced search term into the URL, which re-runs the fetch below.
  useEffect(() => {
    const current = searchParams.get('q') || '';
    if (debouncedSearch !== current) setParam('q', debouncedSearch);
  }, [debouncedSearch, searchParams, setParam]);

  // Keep the input in sync when the URL changes from outside (back button, clear).
  useEffect(() => {
    if (urlQuery !== debouncedSearch) setSearch(urlQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  const { data, error, loading, refetch } = useFetch(
    () => expenseService.listExpenses(houseId, readParams(searchParams)),
    [houseId, queryString],
  );

  const { data: memberData } = useFetch(() => houseService.fetchMembers(houseId), [houseId]);
  const members = useMemo(() => memberData?.members ?? [], [memberData]);

  const category = searchParams.get('category') || '';
  const member = searchParams.get('member') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const sort = searchParams.get('sort') || 'date:desc';

  const items = data?.items ?? [];
  const meta = data?.meta;
  const summary = meta?.summary ?? { total: 0, count: 0 };
  const hasFilters = FILTER_KEYS.some((key) => searchParams.get(key));

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearch('');
  };

  const canModify = (expense) => idOf(expense.createdBy) === user?._id || isManager;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const message = await expenseService.deleteExpense(houseId, deleteTarget._id);
      toast.success(message || 'Expense deleted');
      setDeleteTarget(null);
      refetch();
    } catch (deleteError) {
      toast.fromError(deleteError);
    } finally {
      setDeleting(false);
    }
  }

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...EXPENSE_CATEGORIES.map((entry) => ({ value: entry.value, label: `${entry.emoji} ${entry.label}` })),
  ];

  const memberOptions = [
    { value: '', label: 'Everyone' },
    ...members.map((entry) => ({ value: entry._id, label: entry.name })),
  ];

  const columns = [
    {
      key: 'title',
      header: 'Expense',
      mobilePrimary: true,
      cell: (expense) => (
        <div className="flex items-center gap-3">
          <CategoryIcon category={expense.category} size="md" />
          <div className="min-w-0">
            <Link
              to={`/expenses/${expense._id}`}
              className="block truncate text-sm font-medium text-foreground transition hover:text-primary"
            >
              {expense.title}
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted">
              {categoryLabel(expense.category)} &middot; {formatRelativeTime(expense.date)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'paidBy',
      header: 'Paid by',
      mobileLabel: 'Paid by',
      cell: (expense) => <UserChip user={expense.paidBy} size="sm" truncate />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      mobileLabel: 'Amount',
      cell: (expense) => (
        <span className="tabular text-sm font-semibold text-foreground">{formatCurrency(expense.amount)}</span>
      ),
    },
    {
      key: 'splitType',
      header: 'Split',
      mobileLabel: 'Split',
      cell: (expense) => <Badge tone="neutral">{SPLIT_TYPE_LABELS[expense.splitType] || expense.splitType}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      mobileTrailing: true,
      cell: (expense) => {
        const menuItems = [{ label: 'View', icon: Eye, to: `/expenses/${expense._id}` }];
        if (canModify(expense)) {
          menuItems.push({ separator: true });
          menuItems.push({ label: 'Edit', icon: Pencil, to: `/expenses/${expense._id}/edit` });
          menuItems.push({
            label: 'Delete',
            icon: Trash2,
            danger: true,
            onClick: () => setDeleteTarget(expense),
          });
        }

        return (
          <Dropdown
            align="right"
            items={menuItems}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${expense.title}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        title="Expenses"
        description="Every bill the house has shared, and who paid for it."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Expenses' }]}
        actions={
          <Button as={Link} to="/expenses/new" icon={Plus}>
            Add expense
          </Button>
        }
      />

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total spent"
            value={formatCurrency(summary.total)}
            sub={hasFilters ? 'matching these filters' : 'across the house'}
            icon={Receipt}
            tone="primary"
          />
          <StatCard
            label="Expenses"
            value={summary.count}
            sub={summary.count === 1 ? 'bill recorded' : 'bills recorded'}
            icon={Hash}
          />
          <StatCard
            label="Average expense"
            value={formatCurrency(summary.count ? Math.round(summary.total / summary.count) : 0)}
            sub="per bill"
            icon={TrendingUp}
          />
        </div>
      )}

      <SectionCard
        title="Filters"
        action={
          hasFilters ? (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Search"
            icon={Search}
            placeholder="Title or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(event) => setParam('category', event.target.value)}
          />

          <Select
            label="Member"
            options={memberOptions}
            value={member}
            onChange={(event) => setParam('member', event.target.value)}
          />

          <Input label="From" type="date" value={from} onChange={(event) => setParam('from', event.target.value)} />

          <Input label="To" type="date" value={to} onChange={(event) => setParam('to', event.target.value)} />

          <Select
            label="Sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(event) => setParam('sort', event.target.value)}
          />
        </div>
      </SectionCard>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            emptyState={
              <EmptyState
                icon={Receipt}
                title={hasFilters ? 'No expenses match these filters' : 'No expenses yet'}
                description={
                  hasFilters
                    ? 'Try a different search, category, member or date range.'
                    : 'Add the first bill and HOUSEHUB will work out who owes what.'
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" size="sm" icon={RotateCcw} onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button as={Link} to="/expenses/new" size="sm" icon={Plus}>
                      Add expense
                    </Button>
                  )
                }
              />
            }
            footnote={meta ? `Showing ${items.length} of ${meta.total} matching expenses.` : undefined}
            // No outer card on phones - the stacked rows already look like
            // cards, and nesting them would double up the borders.
            className="sm:rounded-xl sm:border sm:border-border sm:bg-surface sm:p-4 sm:shadow-card"
          />

          <Pagination meta={meta} onChange={(page) => setParam('page', String(page))} itemLabel="expense" />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this expense?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed and every balance recalculated. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete expense"
        loading={deleting}
      />
    </div>
  );
}
