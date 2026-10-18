import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as expenseService from '@/services/expenseService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { Card, ErrorState, PageHeader, SkeletonList } from '@/components/ui';
import ExpenseForm from './ExpenseForm';

/**
 * Add an expense.
 *
 * The members list is loaded here rather than inside the form so the form can
 * stay a pure presentation component, and so the payer/participant pickers are
 * guaranteed to be populated before the user can submit.
 */
export default function ExpenseNew() {
  useDocumentTitle('Add expense');

  const { houseId } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, error, loading, refetch } = useFetch(() => houseService.fetchMembers(houseId), [houseId]);
  const members = useMemo(() => data?.members ?? [], [data]);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});

    try {
      const created = await expenseService.createExpense(houseId, payload);
      toast.success('Expense added');
      navigate(`/expenses/${created._id}`);
    } catch (submitError) {
      setFieldErrors(submitError.fieldErrors || {});
      toast.fromError(submitError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 page-stagger">
      <PageHeader
        title="Add expense"
        description="Log a shared bill. HOUSEHUB splits it and keeps everyone's balance honest."
        backTo="/expenses"
      />

      {loading && (
        <Card>
          <SkeletonList rows={6} />
        </Card>
      )}

      {error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <ExpenseForm
          mode="create"
          members={members}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          submitLabel="Add expense"
          onCancel={() => navigate('/expenses')}
        />
      )}
    </div>
  );
}
