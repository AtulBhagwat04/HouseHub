import { useState } from 'react';
import { Check, Copy, Link2, RefreshCw, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { copyToClipboard } from '@/lib/clipboard';
import { useToast } from '@/context/ToastContext';
import * as houseService from '@/services/houseService';
import { Button, Card, ConfirmDialog, Tooltip } from '@/components/ui';

/**
 * The invite panel: code, shareable link, and (for managers) regenerate.
 *
 * The code and the link are two copies of the same thing shown deliberately -
 * people read the code out loud and paste the link into a chat.
 *
 * Regenerating is destructive (the old link stops working) so it is behind a
 * confirmation, and the new value is echoed back from the server rather than
 * guessed locally.
 */
export default function InviteCard({
  houseId,
  inviteCode,
  inviteLink,
  allowInvites = true,
  canManage = true,
  onRegenerated,
  compact = false,
}) {
  const toast = useToast();

  const [code, setCode] = useState(inviteCode || '');
  const [link, setLink] = useState(inviteLink || '');
  const [copied, setCopied] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function copy(value, key) {
    const ok = await copyToClipboard(value);
    if (!ok) {
      toast.error('Could not copy automatically. Select the text and copy it manually.');
      return;
    }

    setCopied(key);
    toast.success(key === 'link' ? 'Invite link copied' : 'Invite code copied');
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000);
  }

  async function share() {
    if (navigator.share && link) {
      try {
        await navigator.share({ title: 'Join my house on HOUSEHUB', text: 'Join my house on HOUSEHUB', url: link });
        return;
      } catch {
        /* the user dismissed the sheet - fall back to copying */
      }
    }
    copy(link, 'link');
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const result = await houseService.regenerateInvite(houseId);
      setCode(result.inviteCode);
      setLink(result.inviteLink);
      setConfirmOpen(false);
      onRegenerated?.(result);
      toast.success(result.message || 'A new invite code was generated');
    } catch (error) {
      toast.fromError(error, 'Could not generate a new invite code');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card className={cn('overflow-hidden', compact && 'p-4')}>
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Invite your housemates
          </h2>
          <p className="mt-1 text-sm text-muted">
            {allowInvites
              ? 'Anyone with this link can join the house. Share it only with people you live with.'
              : 'Invites are currently turned off for this house. Turn them back on in House Settings.'}
          </p>
        </div>

        {canManage && (
          <Tooltip content={allowInvites ? 'Generate a new invite code' : 'Invites are turned off for this house'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              disabled={!allowInvites}
              aria-label="Generate a new invite code"
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </div>

      <div className="relative mt-4 space-y-3">
        <div className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary-soft/50 py-2 pl-4 pr-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xl font-semibold tracking-[0.18em] text-primary tabular">
            {code || 'Unavailable'}
          </span>

          <Tooltip content={copied === 'code' ? 'Copied' : 'Copy the invite code'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copy(code, 'code')}
              disabled={!code}
              aria-label="Copy the invite code"
              className={cn('shrink-0', copied === 'code' && 'text-success')}
            >
              {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted">{link || 'No link yet'}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={copied === 'link' ? Check : Copy} onClick={() => copy(link, 'link')} disabled={!link}>
            {copied === 'link' ? 'Link copied' : 'Copy link'}
          </Button>

          <Button variant="outline" size="sm" icon={Share2} onClick={share} disabled={!link}>
            Share
          </Button>
        </div>

        {!canManage && (
          <p className="text-2xs text-muted">
            Only an owner or an admin can generate a new code. Ask one of them if this link ever needs
            replacing.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        loading={regenerating}
        onClose={() => setConfirmOpen(false)}
        onConfirm={regenerate}
        title="Generate a new invite code?"
        description="The current link and code will stop working immediately. Anyone who has not joined yet will need the new link."
        confirmLabel="Generate new code"
      />
    </Card>
  );
}
