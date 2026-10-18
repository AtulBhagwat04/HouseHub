import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import * as choreService from '@/services/choreService';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import ChoreForm from './ChoreForm';

/**
 * New chore.
 *
 * The form is shared with Edit, so this page only loads the members for the
 * assignee picker, calls the service and decides where to go next.
 */
export default function ChoreNew() {
  useDocumentTitle('New chore');

  const { houseId } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data, error, loading, refetch } = useFetch(() => houseService.fetchMembers(houseId), [houseId]);
  const members = data?.members || [];

  async function handleSubmit(payload) {
    setSubmitting(true);
    setFieldErrors({});

    try {
      const chore = await choreService.createChore(houseId, payload);
      toast.success('Chore created');
      navigate(`/chores/${chore._id}`);
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      toast.fromError(error);
    } finally {
      setSubmitting(false);
    }
  }

  const header = <PageHeader title="Add a chore" description="Assign work to a housemate and set what it is worth." backTo="/chores" />;

  // The form must not mount before the members arrive, or the assignee picker
  // would start empty and the current user would not be preselected.
  if (loading) {
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

  if (error) {
    return (
      <div className="space-y-5">
        {header}
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {members.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No housemates to assign this to"
            description="A chore needs somebody to do it. Invite a housemate, then come back."
            action={
              <Button as={Link} to="/house" size="sm" variant="outline" icon={Users}>
                Invite housemates
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ChoreForm
            mode="create"
            members={members}
            submitting={submitting}
            onSubmit={handleSubmit}
            submitLabel="Add chore"
            fieldErrors={fieldErrors}
            onCancel={() => navigate('/chores')}
          />
        </Card>
      )}
    </div>
  );
}
