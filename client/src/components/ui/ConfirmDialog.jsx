import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from './Button';
import Modal from './Modal';

/**
 * Destructive-action confirmation.
 *
 * `loading` is driven by the caller's in-flight request so the dialog cannot be
 * dismissed mid-delete, which is what usually produces "did it work?" double
 * clicks.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  const isDanger = tone === 'danger';

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      size="sm"
      closeOnBackdrop={!loading}
      showClose={!loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
            isDanger
              ? 'border-error/25 bg-error-soft text-error'
              : 'border-warning/30 bg-warning-soft text-warning',
          )}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 space-y-1 pt-0.5">
          <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
    </Modal>
  );
}
