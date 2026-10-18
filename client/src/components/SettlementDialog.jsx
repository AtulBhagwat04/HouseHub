import { useEffect, useState } from 'react';
import { HandCoins, Info } from 'lucide-react';
import * as settlementService from '@/services/settlementService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatRupees, parseAmountToPaise, toRupees } from '@/lib/format';
import { Button, ConfirmDialog, Input, Modal, Select, Textarea } from '@/components/ui';

/**
 * Rupees as text for the amount input.
 *
 * formatRupees drops the paise, so keep them when the amount is not a whole
 * rupee - rounding here would quietly change what actually gets recorded.
 */
function paiseToInput(paise) {
  const value = toRupees(paise ?? 0);
  if (Number.isInteger(value)) return formatRupees(paise).replace(/[₹,\s]/g, '');
  return String(value);
}

/**
 * Records a payment between two housemates.
 *
 * A settlement is a request, not a completed transfer: it only moves the ledger
 * once the receiving person confirms it, which the UI says plainly because the
 * number is otherwise easy to misread as "done".
 */
export default function SettlementDialog({
  open,
  onClose,
  onCreated,
  defaultFrom,
  defaultTo,
  defaultAmount,
  houseId,
  members = [],
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ from: '', to: '', amount: '', note: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /**
   * Seed the form each time the dialog opens. Only `open` and the prefill props
   * are dependencies on purpose: `members` is a fresh array on each parent
   * render, and including it would wipe out whatever the user is typing.
   */
  useEffect(() => {
    if (!open) return;

    const others = members.filter((member) => member._id !== user?._id);
    setForm({
      from: defaultFrom || user?._id || '',
      to: defaultTo || others[0]?._id || '',
      amount: defaultAmount ? paiseToInput(defaultAmount) : '',
      note: '',
    });
    setFieldErrors({});
    setSubmitting(false);
    setConfirmOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultFrom, defaultTo, defaultAmount, user?._id]);

  const label = (member) => (member._id === user?._id ? `${member.name} (you)` : member.name);

  // Disable the person already picked on the other side so the same member can
  // never be both payer and payee.
  const fromOptions = members.map((member) => ({
    value: member._id,
    label: label(member),
    disabled: member._id === form.to,
  }));
  const toOptions = members.map((member) => ({
    value: member._id,
    label: label(member),
    disabled: member._id === form.from,
  }));

  const recipient = members.find((member) => member._id === form.to);
  const samePerson = Boolean(form.from && form.from === form.to);
  const amountPaise = parseAmountToPaise(form.amount);
  const exceedsOutstanding = Boolean(defaultAmount && amountPaise && amountPaise > defaultAmount);

  const update = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  function validate() {
    const errors = {};
    if (!form.from) errors.from = 'Choose who paid';
    if (!form.to) errors.to = 'Choose who received the money';
    if (form.from && form.to && form.from === form.to) errors.to = 'Choose two different members';
    if (!form.amount.trim()) errors.amount = 'Enter an amount';
    else if (!amountPaise) errors.amount = 'Enter a valid amount, for example 850 or 850.50';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const settlement = await settlementService.createSettlement(houseId, {
        from: form.from,
        to: form.to,
        amount: amountPaise,
        note: form.note.trim(),
      });

      toast.success('Settlement recorded. Waiting for confirmation.');
      onCreated?.(settlement);
      onClose?.();
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      toast.fromError(error);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    // A settlement need not relate to a specific bill, so a larger amount is
    // allowed - it just deserves a second look.
    if (exceedsOutstanding) {
      setConfirmOpen(true);
      return;
    }

    submit();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Record a settlement"
        description="Log a payment between two housemates."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="settlement-form"
              icon={HandCoins}
              loading={submitting}
              disabled={samePerson}
            >
              Record settlement
            </Button>
          </>
        }
      >
        <form id="settlement-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Paid by"
              value={form.from}
              onChange={update('from')}
              options={fromOptions}
              error={fieldErrors.from}
              required
            />
            <Select
              label="Paid to"
              value={form.to}
              onChange={update('to')}
              options={toOptions}
              error={fieldErrors.to}
              required
            />
          </div>

          <Input
            label="Amount"
            prefix="₹"
            inputMode="decimal"
            placeholder="850"
            value={form.amount}
            onChange={update('amount')}
            error={fieldErrors.amount}
            hint={
              !fieldErrors.amount && defaultAmount
                ? `Recorded as paid: ${formatCurrency(defaultAmount)} outstanding between you`
                : undefined
            }
            required
          />

          <Textarea
            label="Note"
            rows={2}
            placeholder="Optional - cash, UPI reference, anything useful"
            value={form.note}
            onChange={update('note')}
          />

          <div className="flex gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-xs text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Balances only change once{' '}
              <span className="font-medium text-foreground">{recipient?.name || 'the person paid'}</span> confirms this
              payment. Until then it sits as a pending request.
            </p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
        title="More than the outstanding balance"
        description={`You recorded ${formatCurrency(amountPaise || 0)} but only ${formatCurrency(
          defaultAmount || 0,
        )} is outstanding between the two of you. You can still record it - settlements are not tied to a single bill.`}
        confirmLabel="Record anyway"
        tone="warning"
        loading={submitting}
      />
    </>
  );
}
