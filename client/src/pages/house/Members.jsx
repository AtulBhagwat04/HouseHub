import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, LogOut, MoreVertical, Shield, ShieldOff, UserMinus, UserPlus, Users } from 'lucide-react';
import * as houseService from '@/services/houseService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle, useFetch } from '@/hooks';
import { ROLE_LABELS } from '@/lib/catalogue';
import { formatDate, pluralise } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  SkeletonCards,
  XpBadge,
} from '@/components/ui';
import InviteCard from '@/components/InviteCard';

const ROLE_TONES = { owner: 'gold', admin: 'primary', member: 'neutral' };

/**
 * Who lives here, and what each person is allowed to do.
 *
 * Members are cards rather than table rows because each one carries a lot of
 * unrelated facts (role, XP, rank, balance) that do not line up into a
 * meaningful column structure on a phone.
 */
export default function Members() {
  useDocumentTitle('Members');

  const { houseId, user, role, isOwner, logout, setHouse } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, error, loading, refetch } = useFetch(() => houseService.fetchMembers(houseId), [houseId]);
  const { data: invite, loading: inviteLoading } = useFetch(
    () => houseService.fetchInvite(houseId),
    [houseId],
  );

  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const members = data?.members || [];
  const totalMembers = data?.totalMembers ?? members.length;
  const isAdmin = role === 'admin';
  const canManage = isOwner || isAdmin;

  function scrollToInvite() {
    document.getElementById('house-invite')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function changeRole(member, nextRole) {
    setBusy(true);
    try {
      const message = await houseService.updateMemberRole(houseId, member._id, nextRole);
      toast.success(message || `${member.name} is now ${nextRole === 'admin' ? 'an admin' : 'a member'}`);
      await refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(false);
    }
  }

  async function transferOwnership(member) {
    setBusy(true);
    try {
      const updated = await houseService.transferOwnership(houseId, member._id);
      // Mirror the new role immediately so the sidebar and the member menus stop
      // offering owner-only actions without a reload.
      setHouse(updated);
      toast.success(`${member.name} is now the owner`);
      await refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function removeMember(member) {
    setBusy(true);
    try {
      const message = await houseService.removeMember(houseId, member._id);
      toast.success(message || `${member.name} was removed`);
      await refetch();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function leaveHouse() {
    setBusy(true);
    try {
      const message = await houseService.leaveHouse(houseId);
      toast.success(message || 'You left the house');
      // The session is gone the moment the house is, so drop it rather than
      // leaving the app shell pointed at a house this user no longer belongs to.
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === 'transfer') transferOwnership(confirm.member);
    else if (confirm.kind === 'remove') removeMember(confirm.member);
    else if (confirm.kind === 'leave') leaveHouse();
  }

  /** The menu items a viewer is actually allowed to use on one member. */
  function actionsFor(member) {
    const isYou = member._id === user?._id;
    const items = [];

    if (isOwner && !isYou && member.role !== 'owner') {
      items.push({
        label: member.role === 'admin' ? 'Make member' : 'Make admin',
        icon: member.role === 'admin' ? ShieldOff : Shield,
        onClick: () => changeRole(member, member.role === 'admin' ? 'member' : 'admin'),
      });

      items.push({
        label: 'Transfer ownership',
        icon: Crown,
        onClick: () => setConfirm({ kind: 'transfer', member }),
      });
    }

    // The owner can never be removed, and an admin may not remove another admin.
    const canRemove =
      !isYou && member.role !== 'owner' && (isOwner || (isAdmin && member.role === 'member'));

    if (canRemove) {
      if (items.length > 0) items.push({ separator: true });
      items.push({
        label: 'Remove from house',
        icon: UserMinus,
        danger: true,
        onClick: () => setConfirm({ kind: 'remove', member }),
      });
    }

    return items;
  }

  function balanceCaption(balance) {
    if (balance > 0) return 'owed to them';
    if (balance < 0) return 'they owe';
    return 'settled up';
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'House', to: '/house' }, { label: 'Members' }]}
        title="Members"
        description="Everyone sharing this house, and what they are allowed to do."
        actions={
          <Button variant="outline" size="sm" icon={UserPlus} onClick={scrollToInvite}>
            Invite
          </Button>
        }
      />

      {loading ? (
        <SkeletonCards count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nobody is in this house"
          description="Share the invite link and your housemates will show up here."
          action={
            <Button variant="outline" size="sm" icon={UserPlus} onClick={scrollToInvite}>
              Invite someone
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {members.map((member) => {
            const isYou = member._id === user?._id;
            const items = actionsFor(member);

            return (
              <li key={member._id}>
                <Card className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={member.avatarUrl} name={member.name} size="lg" />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member.name}
                          {isYou && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge tone={ROLE_TONES[member.role] || 'neutral'} size="sm">
                            {ROLE_LABELS[member.role] || 'Member'}
                          </Badge>
                          <span className="text-2xs text-muted">Joined {formatDate(member.joinedAt)}</span>
                        </div>

                        {member.email && <p className="mt-1 truncate text-2xs text-muted">{member.email}</p>}
                      </div>
                    </div>

                    {items.length > 0 && (
                      <Dropdown
                        items={items}
                        disabled={busy}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <XpBadge xp={member.xp} level={member.level} variant="chip" />
                    <Badge tone="neutral" size="sm">
                      Rank #{member.rank ?? '—'}
                    </Badge>
                    <Badge tone="neutral" size="sm">
                      {pluralise(member.choresCompleted, 'chore')} done
                    </Badge>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5">
                    <span className="text-xs text-muted">{balanceCaption(member.balance)}</span>
                    <Money paise={member.balance} signed tone="auto" />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Invite --------------------------------------------------------- */}
      <div id="house-invite" className="scroll-mt-24">
        {inviteLoading ? (
          <Card>
            <div className="h-32 animate-pulse rounded-lg bg-surface-muted" />
          </Card>
        ) : invite ? (
          <>
            <InviteCard
              houseId={houseId}
              inviteCode={invite.inviteCode}
              inviteLink={invite.inviteLink}
              allowInvites={invite.allowInvites}
              canManage={canManage}
            />

          </>
        ) : null}
      </div>

      {/* Leaving -------------------------------------------------------- */}
      <Card className="border-error/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Leave this house</h2>
            <p className="mt-0.5 text-sm text-muted">
              {isOwner && totalMembers > 1
                ? 'You are the owner, so you have to transfer ownership to someone else before you can leave.'
                : 'You will lose access to every expense, chore and settlement in this house.'}
            </p>
          </div>

          <Button variant="danger" icon={LogOut} onClick={() => setConfirm({ kind: 'leave' })}>
            Leave house
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirm)}
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        tone={confirm?.kind === 'transfer' ? 'warning' : 'danger'}
        confirmLabel={
          confirm?.kind === 'transfer'
            ? 'Transfer ownership'
            : confirm?.kind === 'remove'
              ? 'Remove member'
              : 'Leave house'
        }
        title={
          confirm?.kind === 'transfer'
            ? `Make ${confirm.member.name} the owner?`
            : confirm?.kind === 'remove'
              ? `Remove ${confirm.member.name}?`
              : 'Leave this house?'
        }
        description={
          confirm?.kind === 'transfer'
            ? `You will become an admin and ${confirm.member.name} will get full control of the house, including its settings.`
            : confirm?.kind === 'remove'
              ? `${confirm.member.name} will lose access to this house. Their expenses and settlements stay in the history.`
              : isOwner && totalMembers > 1
                ? 'The API will refuse this until you transfer ownership to another member. If you are the last member, leaving deletes the house and every expense, chore and settlement in it.'
                : 'If you are the last member, leaving deletes the house and every expense, chore and settlement in it.'
        }
      />
    </div>
  );
}
