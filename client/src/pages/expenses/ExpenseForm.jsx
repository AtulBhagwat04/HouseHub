import { useEffect, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  EXPENSE_CATEGORIES,
  SPLIT_TYPES,
  SPLIT_TYPE_LABELS,
  SplitError,
  splitExpense,
} from '@/lib/catalogue';
import { formatCurrency, formatRupees, parseAmountToPaise, todayInputValue, toRupees } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Avatar, Button, Checkbox, FormField, Input, SectionCard, Select, Tabs, Textarea } from '@/components/ui';

/** Stable identity so the error-sync effect in ExpenseForm does not loop. */
const NO_FIELD_ERRORS = {};

/** Rupees as text for the amount inputs, carrying paise through untouched. */
function paiseToInput(paise) {
  const value = toRupees(paise ?? 0);
  if (Number.isInteger(value)) return formatRupees(paise).replace(/[₹,\s]/g, '');
  return String(value);
}

/**
 * Build the initial form state from the edit values (or sensible defaults).
 * Everyone is a participant by default because that is the common case - a
 * house buys a shared thing and splits it evenly.
 */
function buildDefaults(initialValues, members, currentUserId) {
  const memberIds = members.map((member) => member._id);
  const requested = initialValues?.participants || [];
  const participants = requested.filter((id) => memberIds.includes(id));

  return {
    title: initialValues?.title || '',
    amount: initialValues?.amount || '',
    category: initialValues?.category || EXPENSE_CATEGORIES[0]?.value || '',
    date: initialValues?.date || todayInputValue(),
    paidBy: initialValues?.paidBy || (memberIds.includes(currentUserId) ? currentUserId : memberIds[0]) || '',
    splitType: initialValues?.splitType || SPLIT_TYPES[0],
    description: initialValues?.description || '',
    receiptUrl: initialValues?.receiptUrl || '',
    participants: participants.length > 0 ? participants : memberIds,
    shares: initialValues?.shares || {},
    percentages: initialValues?.percentages || {},
  };
}

/**
 * The one expense form, shared by "add" and "edit".
 *
 * It never decides the authoritative split - it only previews one with the same
 * `splitExpense` the server runs, so a mismatch is visible while typing instead
 * of turning into a 400 on submit. The payload it hands back is integer paise in
 * the exact participant shape the API expects per split type.
 */
export default function ExpenseForm({
  mode = 'create',
  initialValues,
  members = [],
  submitting = false,
  onSubmit,
  submitLabel,
  onCancel,
  fieldErrors = NO_FIELD_ERRORS,
}) {
  const { user } = useAuth();

  const defaults = useMemo(
    () => buildDefaults(initialValues, members, user?._id),
    [initialValues, members, user?._id],
  );

  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState(fieldErrors);
  const [formError, setFormError] = useState('');

  // Re-seed when the edit data lands after mount (the page renders the form only
  // once the fetch resolves, so this normally runs against freshly prefilled data).
  useEffect(() => {
    setForm(defaults);
  }, [defaults]);

  // Take the parent's server field errors, but clear each one as soon as the
  // user edits that field so a stale message cannot linger.
  useEffect(() => {
    setServerErrors(fieldErrors);
  }, [fieldErrors]);

  const fieldError = (key) => errors[key] || serverErrors[key];
  const amountPaise = parseAmountToPaise(form.amount);
  const selectedMembers = members.filter((member) => form.participants.includes(member._id));

  const clearFieldError = (key) => {
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerErrors((current) => ({ ...current, [key]: undefined }));
  };

  const update = (key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
    setFormError('');
  };

  const updateShare = (id, value) =>
    setForm((current) => ({ ...current, shares: { ...current.shares, [id]: value } }));

  const updatePercentage = (id, value) =>
    setForm((current) => ({ ...current, percentages: { ...current.percentages, [id]: value } }));

  function toggleParticipant(id) {
    setForm((current) => {
      const selected = current.participants.includes(id);
      return {
        ...current,
        participants: selected
          ? current.participants.filter((value) => value !== id)
          : [...current.participants, id],
      };
    });
    clearFieldError('participants');
    setFormError('');
  }

  /** Seed custom/percentage values from an even split so the totals start matching. */
  function changeSplitType(nextType) {
    setForm((current) => {
      const selected = members.filter((member) => current.participants.includes(member._id));
      const next = { ...current, splitType: nextType };
      const currentAmount = parseAmountToPaise(current.amount);

      if (nextType === 'custom' && Object.keys(current.shares).length === 0 && currentAmount && selected.length > 0) {
        try {
          const even = splitExpense({
            amountPaise: currentAmount,
            splitType: 'equal',
            participants: selected.map((member) => ({ user: member._id })),
          });
          next.shares = Object.fromEntries(even.map((entry) => [entry.user, paiseToInput(entry.share)]));
        } catch {
          // Leave the fields blank and let the preview explain what is missing.
        }
      }

      if (nextType === 'percentage' && Object.keys(current.percentages).length === 0 && selected.length > 0) {
        const each = Math.round((100 / selected.length) * 100) / 100;
        next.percentages = Object.fromEntries(selected.map((member) => [member._id, String(each)]));
      }

      return next;
    });
    setFormError('');
  }

  const splitParticipants = useMemo(
    () =>
      selectedMembers.map((member) => {
        if (form.splitType === 'custom') {
          return { user: member._id, share: parseAmountToPaise(form.shares[member._id]) ?? undefined };
        }
        if (form.splitType === 'percentage') {
          const raw = form.percentages[member._id];
          return { user: member._id, percentage: raw === undefined || raw === '' ? undefined : Number(raw) };
        }
        return { user: member._id };
      }),
    [selectedMembers, form.splitType, form.shares, form.percentages],
  );

  // Preview the split with the shared splitter. Any problem is a SplitError with
  // a human-readable message, which we show in place of the preview.
  let preview = null;
  let previewError = '';
  if (amountPaise && selectedMembers.length > 0) {
    try {
      preview = splitExpense({ amountPaise, splitType: form.splitType, participants: splitParticipants });
    } catch (error) {
      previewError = error instanceof SplitError ? error.message : 'Could not work out this split';
    }
  }

  const shareByUser = new Map((preview || []).map((entry) => [String(entry.user), entry.share]));

  const customTotal = selectedMembers.reduce(
    (sum, member) => sum + (parseAmountToPaise(form.shares[member._id]) || 0),
    0,
  );
  const percentageTotal = selectedMembers.reduce(
    (sum, member) => sum + (Number(form.percentages[member._id]) || 0),
    0,
  );
  const customMatches = Boolean(amountPaise) && customTotal === amountPaise;
  const percentageMatches = Math.abs(percentageTotal - 100) < 0.001;

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Give this expense a name';
    if (!amountPaise) nextErrors.amount = 'Enter a valid amount, for example 1200 or 1200.50';
    if (!form.paidBy) nextErrors.paidBy = 'Choose who paid';
    if (!form.date) nextErrors.date = 'Choose a date';
    if (selectedMembers.length === 0) nextErrors.participants = 'Select at least one participant';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError('');
      return;
    }

    // Gate the submit on the shared splitter so a bad total is caught here.
    try {
      splitExpense({ amountPaise, splitType: form.splitType, participants: splitParticipants });
    } catch (error) {
      setFormError(error instanceof SplitError ? error.message : 'Could not work out this split');
      return;
    }

    const participants = splitParticipants.map((participant) => {
      if (form.splitType === 'custom') return { user: participant.user, share: participant.share };
      if (form.splitType === 'percentage') {
        return { user: participant.user, percentage: participant.percentage };
      }
      return { user: participant.user };
    });

    onSubmit?.({
      title: form.title.trim(),
      amount: amountPaise,
      category: form.category,
      paidBy: form.paidBy,
      participants,
      splitType: form.splitType,
      date: form.date,
      description: form.description.trim(),
      receiptUrl: form.receiptUrl.trim(),
    });
  }

  const categoryOptions = EXPENSE_CATEGORIES.map((category) => ({
    value: category.value,
    label: `${category.emoji} ${category.label}`,
  }));

  const paidByOptions = members.map((member) => ({
    value: member._id,
    label: member._id === user?._id ? `${member.name} (you)` : member.name,
  }));

  const splitTabs = SPLIT_TYPES.map((type) => ({ value: type, label: SPLIT_TYPE_LABELS[type] }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-soft px-3.5 py-2.5 text-sm text-error">
          {formError}
        </div>
      )}

      <SectionCard title="Expense details">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Weekly groceries"
            value={form.title}
            onChange={update('title')}
            error={fieldError('title')}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount"
              prefix="₹"
              inputMode="decimal"
              placeholder="1200"
              value={form.amount}
              onChange={update('amount')}
              error={fieldError('amount')}
              hint={!fieldError('amount') ? 'Rupees. Paise are kept exactly.' : undefined}
              required
            />

            <Select
              label="Category"
              options={categoryOptions}
              value={form.category}
              onChange={update('category')}
              error={fieldError('category')}
              required
            />

            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={update('date')}
              error={fieldError('date')}
              required
            />

            <Select
              label="Paid by"
              options={paidByOptions}
              value={form.paidBy}
              onChange={update('paidBy')}
              error={fieldError('paidBy')}
              required
            />
          </div>

          <Textarea
            label="Description"
            rows={3}
            placeholder="Optional - what this covered"
            value={form.description}
            onChange={update('description')}
            error={fieldError('description')}
          />

          <Input
            label="Receipt URL"
            type="url"
            placeholder="https://..."
            value={form.receiptUrl}
            onChange={update('receiptUrl')}
            error={fieldError('receiptUrl')}
            hint={!fieldError('receiptUrl') ? 'File uploads arrive in a later phase - paste a link for now.' : undefined}
          />
        </div>
      </SectionCard>

      <SectionCard title="Split" description="Who shares this expense, and how.">
        <div className="space-y-5">
          <Tabs variant="pills" tabs={splitTabs} value={form.splitType} onChange={changeSplitType} />

          <FormField
            label="Split between"
            htmlFor="expense-participants"
            required
            error={fieldError('participants')}
            hint={!fieldError('participants') ? 'Everyone is included by default.' : undefined}
          >
            <div id="expense-participants" className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => (
                <div key={member._id} className="rounded-lg border border-border px-3 py-2">
                  <Checkbox
                    checked={form.participants.includes(member._id)}
                    onChange={() => toggleParticipant(member._id)}
                    label={
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar src={member.avatarUrl} name={member.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">{member.name}</span>
                          {member._id === user?._id && <span className="block text-2xs text-muted">You</span>}
                        </span>
                      </span>
                    }
                  />
                </div>
              ))}
            </div>
          </FormField>

          {selectedMembers.length === 0 ? (
            <p className="text-sm text-muted">Select at least one person to split this expense with.</p>
          ) : (
            <div className="space-y-4">
              {form.splitType !== 'equal' && (
                <ul className="space-y-2.5">
                  {selectedMembers.map((member) => (
                    <li key={member._id} className="flex items-center gap-2.5">
                      <Avatar src={member.avatarUrl} name={member.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{member.name}</span>

                      <div className="w-32 shrink-0">
                        {form.splitType === 'custom' ? (
                          <Input
                            size="sm"
                            prefix="₹"
                            inputMode="decimal"
                            placeholder="0"
                            value={form.shares[member._id] ?? ''}
                            onChange={(event) => updateShare(member._id, event.target.value)}
                            aria-label={`Share for ${member.name}`}
                          />
                        ) : (
                          <Input
                            size="sm"
                            suffix="%"
                            inputMode="decimal"
                            placeholder="0"
                            value={form.percentages[member._id] ?? ''}
                            onChange={(event) => updatePercentage(member._id, event.target.value)}
                            aria-label={`Percentage for ${member.name}`}
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {form.splitType === 'custom' && (
                <p className={cn('tabular text-xs font-medium', customMatches ? 'text-success' : 'text-error')}>
                  {formatCurrency(customTotal)} of {formatCurrency(amountPaise || 0)} allocated
                  {customMatches ? ' - matches the total' : ' - must match the expense total'}
                </p>
              )}

              {form.splitType === 'percentage' && (
                <p className={cn('tabular text-xs font-medium', percentageMatches ? 'text-success' : 'text-error')}>
                  {Math.round(percentageTotal * 100) / 100}% allocated
                  {percentageMatches ? ' - adds up to 100%' : ' - must add up to 100%'}
                </p>
              )}

              {previewError ? (
                <p className="text-sm text-error" role="alert">
                  {previewError}
                </p>
              ) : (
                preview && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <p className="border-b border-border bg-surface-muted/60 px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted">
                      Preview
                    </p>
                    <ul className="divide-y divide-border">
                      {selectedMembers.map((member) => (
                        <li key={member._id} className="flex items-center gap-2.5 px-3 py-2">
                          <Avatar src={member.avatarUrl} name={member.name} size="xs" />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{member.name}</span>
                          <span className="tabular text-sm font-medium text-foreground">
                            {formatCurrency(shareByUser.get(String(member._id)) ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" icon={Receipt} loading={submitting}>
          {submitLabel || (mode === 'edit' ? 'Save changes' : 'Add expense')}
        </Button>
      </div>
    </form>
  );
}
