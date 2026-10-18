import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as choreService from '@/services/choreService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { toDateInputValue } from '@/lib/format';
import { Card, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import ChoreForm from './ChoreForm';

/**
 * Edit a chore.
 *
 * Completion is deliberately not offered here: it has to go through the
 * complete endpoint so XP is credited exactly once, and adding a "mark done"
 * checkbox to a form is exactly how that guarantee gets broken.
 *
 * The form is only mounted once the chore has loaded, so its initial state is
 * built from real values instead of patched afterwards.
 */
export default function ChoreEdit() {
  useDocumentTitle('Edit chore');

  const { choreId } = useParams();
  const { houseId } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: chore, error, loading, refetch } = useFetch(
    () => choreService.getChore(houseId, choreId),
    [houseId, choreId],
  );

  const { data: memberData, error: membersError, loading: membersLoading } = useFetch(
    () => houseService.fetchMembers(houseId),
    [houseId],
  );

  const members = memberData?.members || [];

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});

    try {
      await choreService.updateChore(houseId, choreId, payload);
      toast.success('Chore updated');
      navigate(`/chores/${choreId}`);
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      toast.fromError(error);
    } finally {
      setSubmitting(false);
    }
  }

  const header = <PageHeader title="Edit chore" description="Change the details, the assignee or what it is worth." backTo={`/chores/${choreId}`} />;

  if (loading || membersLoading) {
    return (
      <div className="space-y-5">
        {header}
        <Card className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-48" />
        </Card>
      </div>
    );
  }

  // A 403 or 404 carries a written-for-humans message, so ErrorState is enough.
  if (error || membersError) {
    const failure = error || membersError;
    return (
      <div className="space-y-5">
        {header}
        <ErrorState error={failure} onRetry={refetch} />
      </div>
    );
  }

  if (!chore) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState error={{ status: 404, message: 'That chore no longer exists.' }} />
      </div>
    );
  }

  const initialValues = {
    title: chore.title,
    description: chore.description,
    assignedTo: idOf(chore.assignedTo) || '',
    dueDate: toDateInputValue(chore.dueDate),
    priority: chore.priority,
    xpReward: chore.xpReward,
  };

  return (
    <div className="space-y-5">
      {header}

      <Card>
        <ChoreForm
          mode="edit"
          initialValues={initialValues}
          members={members}
          submitting={submitting}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
          fieldErrors={fieldErrors}
          onCancel={() => navigate(`/chores/${choreId}`)}
        />
      </Card>
    </div>
  );
}

/** `assignedTo` may arrive populated or as a bare id. */
function idOf(value) {
  return typeof value === 'string' ? value : value?._id || null;
}
