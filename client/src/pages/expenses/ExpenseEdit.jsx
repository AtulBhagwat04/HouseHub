import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as expenseService from '@/services/expenseService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { formatRupees, toDateInputValue, toRupees } from '@/lib/format';
import { Card, ErrorState, PageHeader, SkeletonList } from '@/components/ui';
import ExpenseForm from './ExpenseForm';

/** Rupees as text for the amount input, carrying paise through untouched. */
function paiseToInput(paise) {
  const value = toRupees(paise ?? 0);
  if (Number.isInteger(value)) return formatRupees(paise).replace(/[₹,\s]/g, '');
  return String(value);
}

/** A populated reference serialises as an object; an unpopulated one as an id. */
function idOf(value) {
  return typeof value === 'object' && value !== null ? value._id : value;
}

/**
 * Percentages cannot be reconstructed from the stored shares, so seed them from
 * the share proportion and nudge the first entry until they total exactly 100.
 * Otherwise opening an edit form on a percentage split would fail validation
 * before the user has touched anything.
 */
function seedPercentages(expense, participantIds) {
  const amount = Number(expense.amount) || 0;
  if (!amount || participantIds.length === 0) return {};

  const shareByUser = new Map(expense.participants.map((entry) => [idOf(entry.user), Number(entry.share) || 0]));
  const rounded = participantIds.map((id) => Math.round(((shareByUser.get(id) || 0) / amount) * 100 * 100) / 100);
  const total = rounded.reduce((sum, value) => sum + value, 0);
  rounded[0] = Math.round((rounded[0] + (100 - total)) * 100) / 100;

  return Object.fromEntries(participantIds.map((id, index) => [id, String(rounded[index])]));
}

/** Turn a serialised expense back into the shape ExpenseForm expects. */
function toFormValues(expense, members) {
  const memberIds = new Set(members.map((member) => member._id));
  const participants = expense.participants.map((entry) => idOf(entry.user)).filter((id) => memberIds.has(id));

  const shares = {};
  for (const entry of expense.participants) {
    const id = idOf(entry.user);
    if (memberIds.has(id)) shares[id] = paiseToInput(entry.share);
  }

  return {
    title: expense.title,
    amount: paiseToInput(expense.amount),
    category: expense.category,
    date: toDateInputValue(expense.date),
    paidBy: idOf(expense.paidBy),
    splitType: expense.splitType,
    description: expense.description || '',
    receiptUrl: expense.receiptUrl || '',
    participants,
    shares,
    percentages: expense.splitType === 'percentage' ? seedPercentages(expense, participants) : {},
  };
}

const EDIT_BLOCKED = {
  status: 403,
  message: 'Only the person who added this expense, an admin, or the owner can edit it.',
};

/**
 * Edit an expense.
 *
 * The permission check mirrors the server's `canModifyExpense`: fetching an
 * expense is allowed for any member, so the guard has to live here as well as
 * behind the update endpoint.
 */
export default function ExpenseEdit() {
  useDocumentTitle('Edit expense');

  const { expenseId } = useParams();
  const { houseId, user, isManager } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, error, loading, refetch } = useFetch(async () => {
    const [detail, memberData] = await Promise.all([
      expenseService.getExpense(houseId, expenseId),
      houseService.fetchMembers(houseId),
    ]);
    return { expense: detail.expense, members: memberData.members };
  }, [houseId, expenseId]);

  const members = useMemo(() => data?.members ?? [], [data]);
  const initialValues = useMemo(
    () => (data?.expense ? toFormValues(data.expense, members) : null),
    [data, members],
  );

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const canEdit = Boolean(data?.expense && (idOf(data.expense.createdBy) === user?._id || isManager));

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});

    try {
      await expenseService.updateExpense(houseId, expenseId, payload);
      toast.success('Expense updated');
      navigate(`/expenses/${expenseId}`);
    } catch (submitError) {
      setFieldErrors(submitError.fieldErrors || {});
      toast.fromError(submitError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Edit expense" backTo={`/expenses/${expenseId}`} />
        <Card>
          <SkeletonList rows={6} />
        </Card>
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data?.expense) return null;
  if (!canEdit) return <ErrorState error={EDIT_BLOCKED} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Edit expense"
        description="Changes recalculate every affected balance."
        backTo={`/expenses/${expenseId}`}
      />

      <ExpenseForm
        mode="edit"
        initialValues={initialValues}
        members={members}
        submitting={submitting}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        onCancel={() => navigate(`/expenses/${expenseId}`)}
      />
    </div>
  );
}
