import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ExternalLink, Pencil, Trash2, Users } from 'lucide-react';
import * as expenseService from '@/services/expenseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { SPLIT_TYPE_LABELS, categoryMeta } from '@/lib/catalogue';
import { formatCurrency, formatDate, pluralise } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  SectionCard,
  Skeleton,
  SkeletonList,
  UserChip,
} from '@/components/ui';

/** A populated reference serialises as an object; an unpopulated one as an id. */
function idOf(value) {
  return typeof value === 'object' && value !== null ? value._id : value;
}

/**
 * A single expense.
 *
 * The "who owes what" figures are pairwise running totals between each person
 * and the payer, not a per-bill ledger - HOUSEHUB has no concept of a settlement
 * that clears one specific expense, so showing anything else would be a lie.
 */
export default function ExpenseDetails() {
  useDocumentTitle('Expense');

  const { expenseId } = useParams();
  const { houseId, user, isManager } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, error, loading, refetch } = useFetch(
    () => expenseService.getExpense(houseId, expenseId),
    [houseId, expenseId],
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const message = await expenseService.deleteExpense(houseId, expenseId);
      toast.success(message || 'Expense deleted');
      navigate('/expenses');
    } catch (deleteError) {
      toast.fromError(deleteError);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-muted" />
        <Card>
          <Skeleton className="h-10 w-40" />
          <div className="mt-4">
            <SkeletonList rows={3} />
          </div>
        </Card>
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data?.expense) return null;

  const { expense, settlement } = data;
  const meta = categoryMeta(expense.category);
  const canModify = idOf(expense.createdBy) === user?._id || isManager;
  const payerName = expense.paidBy?.name || 'a former member';
  const payerId = idOf(expense.paidBy);

  const settledByUser = new Map(
    (settlement?.pairwiseSettled || []).map((entry) => [String(entry.user), entry.settled]),
  );
  const others = expense.participants.filter((participant) => idOf(participant.user) !== payerId);

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        title={expense.title}
        description={`Paid by ${payerName}`}
        backTo="/expenses"
        breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: expense.title }]}
        actions={
          canModify ? (
            <>
              <Button as={Link} to={`/expenses/${expense._id}/edit`} variant="outline" size="sm" icon={Pencil}>
                Edit
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            </>
          ) : null
        }
      />

      <Card className="overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-primary/15 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">Amount</p>
            <p className="tabular mt-1.5 font-display text-4xl font-semibold leading-none text-foreground">
              {formatCurrency(expense.amount)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="primary">
                <span aria-hidden="true">{meta.emoji}</span>
                {meta.label}
              </Badge>
              <Badge tone="neutral">{SPLIT_TYPE_LABELS[expense.splitType] || expense.splitType}</Badge>
              <Badge tone="neutral" icon={CalendarDays}>
                {formatDate(expense.date)}
              </Badge>
              <Badge tone="neutral" icon={Users}>
                {pluralise(expense.participants.length, 'person', 'people')}
              </Badge>
            </div>
          </div>

          <div className="shrink-0 sm:text-right">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">Paid by</p>
            <UserChip user={expense.paidBy} className="mt-2" />
          </div>
        </div>
      </Card>

      <SectionCard
        title="Who owes what"
        description={`${payerName} fronted the whole bill, so each person's share is owed back to them.`}
      >
        {others.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="Nobody else is on this expense"
            description="The payer covered it alone, so there is nothing to split."
          />
        ) : (
          <ul className="divide-y divide-border">
            {others.map((participant) => {
              const userId = idOf(participant.user);
              const settled = settledByUser.get(String(userId)) || 0;
              const remaining = Math.max(0, participant.share - settled);

              return (
                <li key={userId} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <UserChip user={participant.user} className="min-w-0 flex-1" truncate />

                  <div className="text-right">
                    <p className="text-2xs uppercase tracking-wide text-muted">Share</p>
                    <p className="tabular text-sm font-medium text-foreground">{formatCurrency(participant.share)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xs uppercase tracking-wide text-muted">Settled</p>
                    <Money paise={settled} tone="muted" className="text-sm" />
                  </div>

                  <div className="text-right">
                    <p className="text-2xs uppercase tracking-wide text-muted">Remaining</p>
                    {remaining > 0 ? (
                      <Money paise={remaining} tone="error" className="text-sm" />
                    ) : (
                      <Badge tone="success" size="sm">
                        Settled
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-xs text-muted">
          HOUSEHUB settles people, not individual bills. &ldquo;Settled&rdquo; here is a running pairwise total between each person
          and {payerName}, not a payment against this specific expense.
        </p>
      </SectionCard>

      {(expense.description || expense.receiptUrl) && (
        <SectionCard title="Notes">
          {expense.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{expense.description}</p>
          )}

          {expense.receiptUrl && (
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View receipt
            </a>
          )}
        </SectionCard>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete this expense?"
        description={`"${expense.title}" will be removed and every balance recalculated. This cannot be undone.`}
        confirmLabel="Delete expense"
        loading={deleting}
      />
    </div>
  );
}
