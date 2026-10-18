import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, KeyRound, Save, Trash2 } from 'lucide-react';
import * as authService from '@/services/authService';
import { setStoredToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks';
import { ROLE_LABELS } from '@/lib/catalogue';
import { formatDate, pluralise } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  SectionCard,
  Skeleton,
  XpBadge,
} from '@/components/ui';

const ROLE_TONES = { owner: 'gold', admin: 'primary', member: 'neutral' };

/**
 * The signed-in user's own profile.
 *
 * `useAuth().user` is the authoritative copy, so nothing is refetched here - a
 * save pushes the server's response straight back into the context and every
 * other screen picks it up.
 */
export default function Profile() {
  useDocumentTitle('Profile');

  const { user, role, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', avatarUrl: user?.avatarUrl || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    return (
      <div className="page-stagger space-y-5">
        <PageHeader
          breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Profile' }]}
          title="Profile"
        />
        <Card>
          <Skeleton className="h-24 w-full" rounded="rounded-xl" />
        </Card>
      </div>
    );
  }

  const stats = user.stats || {};

  async function saveProfile(event) {
    event.preventDefault();

    const name = profileForm.name.trim();
    if (name.length < 2 || name.length > 60) {
      setProfileErrors({ name: 'Name must be between 2 and 60 characters' });
      return;
    }

    setSavingProfile(true);
    setProfileErrors({});

    try {
      const updated = await authService.updateProfile({ name, avatarUrl: profileForm.avatarUrl.trim() });
      updateUser(updated);
      toast.success('Profile updated');
    } catch (error) {
      setProfileErrors(error.fieldErrors || {});
      toast.fromError(error);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const nextErrors = {};

    if (!currentPassword) nextErrors.currentPassword = 'Enter your current password';
    if (newPassword.length < 8) nextErrors.newPassword = 'New password must be at least 8 characters';
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = 'The two new passwords do not match';

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }

    setChangingPassword(true);
    setPasswordErrors({});

    try {
      const token = await authService.changePassword({ currentPassword, newPassword });
      // The API rotates the token on a password change. Storing it keeps this
      // client in step with the session the server now considers valid.
      if (token) setStoredToken(token);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (error) {
      setPasswordErrors(error.fieldErrors || {});
      toast.fromError(error);
    } finally {
      setChangingPassword(false);
    }
  }

  async function deleteAccount() {
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      const message = await authService.deleteAccount({ password: deletePassword });
      toast.success(message || 'Your account was deleted');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setDeleteError(error.message);
      toast.fromError(error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Profile' }]}
        title="Profile"
        description="Your name, your XP and the password on this account."
      />

      {/* Header ---------------------------------------------------------- */}
      <Card className="overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-secondary/20 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={user.avatarUrl} name={user.name} size="xl" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-display text-xl font-semibold tracking-tight text-foreground">
                {user.name}
              </h2>
              {role && <Badge tone={ROLE_TONES[role] || 'neutral'}>{ROLE_LABELS[role] || 'Member'}</Badge>}
            </div>

            <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
            <p className="mt-1 text-xs text-muted">
              Here since {formatDate(user.createdAt)} &middot; {pluralise(stats.choresCompleted || 0, 'chore')} completed
            </p>
          </div>

          <div className="sm:w-72 sm:shrink-0">
            <XpBadge xp={user.xp} level={user.level} variant="full" />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Editable profile --------------------------------------------- */}
        <SectionCard title="Your details" description="This is what your housemates see.">
          <form onSubmit={saveProfile} noValidate className="space-y-4">
            <Input
              label="Name"
              name="name"
              value={profileForm.name}
              maxLength={60}
              onChange={(event) => {
                setProfileForm((current) => ({ ...current, name: event.target.value }));
                setProfileErrors({});
              }}
              error={profileErrors.name}
              required
            />

            <Input
              label="Avatar URL"
              name="avatarUrl"
              placeholder="https://..."
              value={profileForm.avatarUrl}
              onChange={(event) => {
                setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }));
                setProfileErrors({});
              }}
              error={profileErrors.avatarUrl}
              hint={profileErrors.avatarUrl ? undefined : 'Optional. Paste a link to a picture of you.'}
            />

            <div className="flex justify-end">
              <Button type="submit" icon={Save} loading={savingProfile}>
                Save changes
              </Button>
            </div>
          </form>
        </SectionCard>

        {/* Stats -------------------------------------------------------- */}
        <SectionCard title="Your record" description="Lifetime totals.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Chores done" value={stats.choresCompleted || 0} />
            <StatTile label="Chores added" value={stats.choresCreated || 0} />
            <StatTile label="Expenses added" value={stats.expensesAdded || 0} />
            <StatTile label="Expenses paid" value={stats.expensesPaid || 0} />
            <StatTile label="Settlements" value={stats.settlementsCompleted || 0} />
            <StatTile label="Level" value={user.level ?? 1} />
          </div>

          <Link
            to="/achievements"
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/60 px-3 py-3 transition hover:border-gold/40 hover:bg-gold/5"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Award className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {pluralise(user.achievements?.length || 0, 'achievement')} unlocked
                </span>
                <span className="block text-xs text-muted">See what is left to earn</span>
              </span>
            </span>

            <Badge tone="gold" size="sm">
              View
            </Badge>
          </Link>
        </SectionCard>
      </div>

      {/* Password ------------------------------------------------------- */}
      <SectionCard
        title="Change password"
        description="You will stay signed in on this device - the server issues a fresh session token."
      >
        <form onSubmit={changePassword} noValidate className="space-y-4">
          <Input
            label="Current password"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            value={passwordForm.currentPassword}
            onChange={(event) => {
              setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }));
              setPasswordErrors({});
            }}
            error={passwordErrors.currentPassword}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="New password"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(event) => {
                setPasswordForm((current) => ({ ...current, newPassword: event.target.value }));
                setPasswordErrors({});
              }}
              error={passwordErrors.newPassword}
              hint={passwordErrors.newPassword ? undefined : 'At least 8 characters.'}
              required
            />

            <Input
              label="Confirm new password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(event) => {
                setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }));
                setPasswordErrors({});
              }}
              error={passwordErrors.confirmPassword}
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="outline" icon={KeyRound} loading={changingPassword}>
              Change password
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Danger zone ---------------------------------------------------- */}
      <Card className="border-error/30 bg-error-soft/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-foreground">Delete account</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-muted text-pretty">
              If you own a house that still has other members, hand ownership over or remove them first -
              the API refuses the delete until the house is not left without an owner. Deleting the account
              of the last member also deletes the house and everything in it.
            </p>
          </div>

          <Button variant="danger" icon={Trash2} onClick={() => setConfirmOpen(true)}>
            Delete account
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          setDeletePassword('');
          setDeleteError('');
          setDeleteOpen(true);
        }}
        title="Delete your account?"
        description="This removes your profile, your XP and your history. It cannot be undone. You will be asked for your password next."
        confirmLabel="Continue"
      />

      <Modal
        open={deleteOpen}
        onClose={deleting ? () => {} : () => setDeleteOpen(false)}
        size="sm"
        title="Confirm your password"
        description="Type your current password to delete the account for good."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteAccount} loading={deleting}>
              Delete my account
            </Button>
          </>
        }
      >
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={deletePassword}
          onChange={(event) => {
            setDeletePassword(event.target.value);
            setDeleteError('');
          }}
          error={deleteError}
          required
        />
      </Modal>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-center transition hover:border-primary/40">
      <p className="tabular font-display text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 text-2xs font-medium uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
