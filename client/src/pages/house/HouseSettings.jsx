import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Save } from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { HOUSE_NAME_MAX } from '@shared/constants.js';
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Input,
  PageHeader,
  SectionCard,
  Skeleton,
  Textarea,
} from '@/components/ui';

/** Server-side shape mapped onto the flat shape the form controls want. */
function formFromHouse(house) {
  return {
    name: house.name || '',
    location: house.location || '',
    description: house.description || '',
    imageUrl: house.imageUrl || '',
    allowInvites: house.settings?.allowInvites !== false,
    notificationsEnabled: house.settings?.notificationsEnabled !== false,
    weeklyChoreGoal: String(house.settings?.weeklyChoreGoal ?? 10),
  };
}

/**
 * House settings.
 *
 * Manager-only. The API enforces the same rule (`requireHouseManager`), so the
 * panel below is a courtesy rather than the actual protection.
 */
export default function HouseSettings() {
  useDocumentTitle('House settings');

  const { houseId, isManager, setHouse, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, error, loading, refetch, setData } = useFetch(
    () => (isManager ? houseService.fetchHouse(houseId) : Promise.resolve(null)),
    [houseId, isManager],
  );

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const house = data?.house;

  // Seed (and re-seed) the form from the server copy so the inputs never drift
  // from what the API actually holds.
  useEffect(() => {
    if (house) setForm(formFromHouse(house));
  }, [house]);

  if (!isManager) {
    return (
      <div className="page-stagger space-y-5">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'House', to: '/house' },
            { label: 'House settings' },
          ]}
          title="House settings"
          backTo="/house"
        />

        <Card>
          <ErrorState
            title="Only the owner and admins can change house settings"
            error={{
              message:
                'Ask an owner or an admin if something needs changing. You can still see everything on the house page.',
            }}
          />

          <div className="mt-2 flex justify-center">
            <Button as={Link} to="/house" variant="outline" size="sm">
              Back to the house
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!house || !form) return;

    const name = form.name.trim();
    if (name.length < 2 || name.length > HOUSE_NAME_MAX) {
      setFieldErrors({ name: `House name must be 2-${HOUSE_NAME_MAX} characters` });
      return;
    }

    const goal = Number(form.weeklyChoreGoal);
    if (!Number.isInteger(goal) || goal < 1 || goal > 500) {
      setFieldErrors({ 'settings.weeklyChoreGoal': 'Weekly goal must be a whole number between 1 and 500' });
      return;
    }

    // Send only what actually changed, so PATCHing the settings checkbox cannot
    // quietly overwrite a name someone edited in another tab.
    const payload = {};
    if (name !== house.name) payload.name = name;
    if (form.location.trim() !== (house.location || '')) payload.location = form.location.trim();
    if (form.description.trim() !== (house.description || '')) payload.description = form.description.trim();
    if (form.imageUrl.trim() !== (house.imageUrl || '')) payload.imageUrl = form.imageUrl.trim();

    const settings = {};
    if (form.allowInvites !== (house.settings?.allowInvites !== false)) settings.allowInvites = form.allowInvites;
    if (form.notificationsEnabled !== (house.settings?.notificationsEnabled !== false)) {
      settings.notificationsEnabled = form.notificationsEnabled;
    }
    if (goal !== house.settings?.weeklyChoreGoal) settings.weeklyChoreGoal = goal;
    if (Object.keys(settings).length > 0) payload.settings = settings;

    if (Object.keys(payload).length === 0) {
      toast.info('Nothing has changed yet');
      return;
    }

    setSaving(true);
    setFieldErrors({});

    try {
      const updated = await houseService.updateHouse(houseId, payload);
      // The sidebar and top bar read the house out of context, so push the new
      // name there rather than making the user reload to see it.
      setHouse(updated);
      setData((current) => ({ ...(current || {}), house: updated }));
      toast.success('House updated');
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      toast.fromError(error);
    } finally {
      setSaving(false);
    }
  }

  async function leaveHouse() {
    setLeaving(true);
    try {
      const message = await houseService.leaveHouse(houseId);
      toast.success(message || 'You left the house');
      logout();
      navigate('/login', { replace: true });
    } catch (leaveError) {
      toast.fromError(leaveError);
    } finally {
      setLeaving(false);
      setLeaveOpen(false);
    }
  }

  const isLastMember = (house?.memberCount ?? 1) <= 1;

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'House', to: '/house' },
          { label: 'House settings' },
        ]}
        title="House settings"
        description="Rename the house, tidy up its details and set the house-wide preferences."
        backTo="/house"
      />

      {loading ? (
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
            <Skeleton className="h-20 w-full" rounded="rounded-xl" />
          </div>
        </Card>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !form ? null : (
        <>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <SectionCard title="House details" description="How this house shows up across HOUSEHUB.">
              <div className="space-y-4">
                <Input
                  label="House name"
                  name="name"
                  value={form.name}
                  maxLength={HOUSE_NAME_MAX}
                  onChange={update('name')}
                  error={fieldErrors.name}
                  hint={fieldErrors.name ? undefined : 'Something your housemates will recognise.'}
                  required
                />

                <Textarea
                  label="Description"
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={update('description')}
                  hint="Optional."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={update('location')}
                    hint="Optional."
                  />

                  <Input
                    label="Image URL"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={update('imageUrl')}
                    hint="Optional. Paste a link for now."
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="House preferences" description="These apply to everyone in the house.">
              <div className="space-y-4">
                <Checkbox
                  variant="switch"
                  label="Allow new members to join"
                  description="With this off, the current invite code stops working."
                  checked={form.allowInvites}
                  onChange={update('allowInvites')}
                />

                <Checkbox
                  variant="switch"
                  label="Send house notifications"
                  description="Chore, expense and settlement updates go out to the house."
                  checked={form.notificationsEnabled}
                  onChange={update('notificationsEnabled')}
                />

                <Input
                  label="Weekly chore goal"
                  name="weeklyChoreGoal"
                  type="number"
                  min={1}
                  max={500}
                  value={form.weeklyChoreGoal}
                  onChange={update('weeklyChoreGoal')}
                  error={fieldErrors['settings.weeklyChoreGoal']}
                  hint={
                    fieldErrors['settings.weeklyChoreGoal']
                      ? undefined
                      : 'How many chores the house aims to finish each week.'
                  }
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setForm(formFromHouse(house));
                    setFieldErrors({});
                  }}
                >
                  Discard changes
                </Button>

                <Button type="submit" icon={Save} loading={saving}>
                  Save changes
                </Button>
              </div>
            </SectionCard>
          </form>

          <Card className="border-error/30 bg-error-soft/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground">Leave house</h2>
                <p className="mt-0.5 max-w-2xl text-sm text-muted text-pretty">
                  {isLastMember
                    ? 'You are the last member, so leaving deletes this house along with every expense, chore and settlement in it. There is no way back from that.'
                    : 'You will lose access to every expense, chore and settlement in this house. If you are the owner, transfer ownership on the Members page first - the API refuses a leave until you do.'}
                </p>
              </div>

              <Button variant="danger" icon={LogOut} onClick={() => setLeaveOpen(true)}>
                Leave house
              </Button>
            </div>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={leaveOpen}
        loading={leaving}
        onClose={() => setLeaveOpen(false)}
        onConfirm={leaveHouse}
        title="Leave this house?"
        description={
          isLastMember
            ? 'Leaving as the last member deletes the house and every expense, chore and settlement recorded in it.'
            : 'You will need a new invite to come back.'
        }
        confirmLabel="Leave house"
      />
    </div>
  );
}
