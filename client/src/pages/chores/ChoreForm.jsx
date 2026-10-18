import { useState } from 'react';
import { CalendarClock, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import {
  CHORE_PRIORITIES,
  DEFAULT_XP_BY_PRIORITY,
  PRIORITY_STYLES,
  XP_REWARDS,
} from '@/lib/catalogue';
import { todayInputValue } from '@/lib/format';
import { Avatar, Badge, Button, Input, Select, Tabs, Textarea } from '@/components/ui';

/** Only the create flow needs a default assignee - edit always has a stored one. */
function initialState(mode, initialValues, currentUserId) {
  const fallbackAssignee = mode === 'create' ? currentUserId || '' : '';
  // "medium" is the server's own default for a new chore, and it is also the
  // middle key of DEFAULT_XP_BY_PRIORITY, so it is a catalogue value rather
  // than an invented one.
  const fallbackPriority = 'medium';

  return {
    title: initialValues.title ?? '',
    description: initialValues.description ?? '',
    assignedTo: initialValues.assignedTo ?? fallbackAssignee,
    dueDate: initialValues.dueDate ?? todayInputValue(),
    priority: initialValues.priority ?? fallbackPriority,
    xpReward: initialValues.xpReward ?? DEFAULT_XP_BY_PRIORITY[fallbackPriority],
  };
}

/**
 * The create/edit chore form.
 *
 * It owns nothing but presentation: the caller supplies the members, the
 * initial values and the submit handler, so the New and Edit pages stay thin
 * and cannot drift apart field by field.
 *
 * Two product rules are encoded here:
 *   - XP is picked from the shared catalogue, never typed. The server rejects
 *     any reward that is not on that list.
 *   - The reward follows the priority until the user picks a value by hand.
 *     After that, changing priority no longer overwrites their choice.
 */
export default function ChoreForm({
  mode = 'create',
  initialValues = {},
  members = [],
  submitting = false,
  onSubmit,
  submitLabel = 'Save chore',
  fieldErrors = {},
  onCancel,
}) {
  const { user } = useAuth();

  const [form, setForm] = useState(() => initialState(mode, initialValues, user?._id));
  const [errors, setErrors] = useState({});

  // In edit mode the stored reward is a deliberate value rather than a derived
  // default, so we treat it as already chosen and leave it alone when priority
  // changes.
  const [rewardChosen, setRewardChosen] = useState(mode === 'edit');

  const errorFor = (key) => errors[key] || fieldErrors?.[key];

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function changePriority(priority) {
    setErrors((current) => (current.priority ? { ...current, priority: undefined } : current));
    setForm((current) => ({
      ...current,
      priority,
      // Keep the reward in step with the priority until the user takes over.
      xpReward: rewardChosen ? current.xpReward : DEFAULT_XP_BY_PRIORITY[priority],
    }));
  }

  function changeReward(value) {
    setRewardChosen(true);
    setField('xpReward', Number(value));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Give the chore a name';
    if (!form.assignedTo) nextErrors.assignedTo = 'Choose who this chore is for';
    if (!form.dueDate) nextErrors.dueDate = 'Pick a due date';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit?.({
      title: form.title.trim(),
      description: form.description.trim(),
      assignedTo: form.assignedTo,
      dueDate: form.dueDate,
      priority: form.priority,
      xpReward: Number(form.xpReward),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormSection title="What needs doing">
        <Input
          label="Chore"
          name="title"
          placeholder="Wash the dishes"
          maxLength={80}
          value={form.title}
          onChange={(event) => setField('title', event.target.value)}
          error={errorFor('title')}
          required
        />

        <Textarea
          label="Description"
          name="description"
          rows={3}
          placeholder="Anything the person doing it should know"
          maxLength={500}
          value={form.description}
          onChange={(event) => setField('description', event.target.value)}
          error={errorFor('description')}
        />
      </FormSection>

      <FormSection title="Who, when and what it is worth">
        <MemberPicker
          members={members}
          value={form.assignedTo}
          onChange={(value) => setField('assignedTo', value)}
          error={errorFor('assignedTo')}
        />

        <Input
          label="Due date"
          name="dueDate"
          type="date"
          icon={CalendarClock}
          value={form.dueDate}
          onChange={(event) => setField('dueDate', event.target.value)}
          error={errorFor('dueDate')}
          required
        />

        {/* Difficulty and reward share the gold treatment so the two halves of
            "what this is worth" read as one decision. */}
        <div className="space-y-4 rounded-2xl border border-gold/25 bg-gold/[0.05] p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-gold text-white shadow-glow-gold">
              <Zap className="h-4 w-4" aria-hidden="true" />
            </span>

            <p className="font-display text-sm font-semibold text-foreground">Difficulty &amp; reward</p>

            <Badge tone="gold" className="tabular ml-auto">
              +{form.xpReward} XP
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Priority</span>

              <Tabs
                variant="pills"
                size="sm"
                className="w-fit max-w-full"
                value={form.priority}
                onChange={changePriority}
                tabs={CHORE_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: PRIORITY_STYLES[priority]?.label || priority,
                }))}
              />

              {errorFor('priority') && (
                <p role="alert" className="text-xs text-error">
                  {errorFor('priority')}
                </p>
              )}
            </div>

            <Select
              label="XP reward"
              name="xpReward"
              value={String(form.xpReward)}
              onChange={(event) => changeReward(event.target.value)}
              options={XP_REWARDS.map((reward) => ({ value: String(reward), label: `+${reward} XP` }))}
              error={errorFor('xpReward')}
              // The reward belongs to the assignee, even when a manager ticks the
              // chore off on their behalf.
              hint="Credited to the person the chore is assigned to when it is completed, not to whoever ticks it off."
            />
          </div>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}

        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * A titled group of fields.
 *
 * These sit inside the page's `Card`, so they use `card-solid` rather than a
 * second glass surface: stacked backdrop blur turns muddy.
 */
function FormSection({ title, children }) {
  return (
    <section className="card-solid p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Assignee picker.
 *
 * A native select cannot render an avatar, and picking "who does this" is a
 * visual decision - you know your housemates by face. A radio group of avatar
 * cards works with a keyboard and on a phone, which a custom listbox would not.
 */
function MemberPicker({ members, value, onChange, error }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        Assigned to
        <span className="ml-0.5 text-error" aria-hidden="true">
          *
        </span>
      </span>

      <div role="radiogroup" aria-label="Assigned to" className="grid gap-2 sm:grid-cols-2">
        {members.map((member) => {
          const selected = member._id === value;

          return (
            <button
              key={member._id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(member._id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99]',
                selected
                  ? 'border-primary/60 bg-primary-soft ring-1 ring-primary/25'
                  : 'border-border bg-surface-muted/25 hover:border-primary/30 hover:bg-primary/[0.04]',
              )}
            >
              <Avatar src={member.avatarUrl} name={member.name} size="sm" />

              <span className="min-w-0 flex-1">
                <span
                  className={cn('block truncate text-sm font-medium', selected ? 'text-primary' : 'text-foreground')}
                >
                  {member.name}
                </span>
                <span className="tabular block text-2xs text-muted">
                  Lv {member.level} &middot; {member.xp} XP
                </span>
              </span>

              {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
