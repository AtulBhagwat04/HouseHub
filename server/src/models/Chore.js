import mongoose from 'mongoose';
import {
  CHORE_PRIORITIES,
  CHORE_STORED_STATUSES,
  DEFAULT_XP_BY_PRIORITY,
  XP_REWARDS,
} from '../../../shared/constants.js';

const { Schema } = mongoose;

const choreSchema = new Schema(
  {
    house: { type: Schema.Types.ObjectId, ref: 'House', required: true },
    title: { type: String, required: [true, 'Chore name is required'], trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: '' },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },

    priority: { type: String, enum: CHORE_PRIORITIES, default: 'medium' },

    /**
     * Server-validated allowlist. The client may REQUEST one of these values at
     * creation time; it can never submit an arbitrary XP number, and XP is never
     * accepted at completion time at all.
     */
    xpReward: {
      type: Number,
      enum: {
        values: XP_REWARDS,
        message: 'XP reward must be one of the allowed values',
      },
      default: function defaultXp() {
        return DEFAULT_XP_BY_PRIORITY[this.priority] ?? 25;
      },
    },

    /**
     * Only real, user-settable statuses are stored. "Overdue" is DERIVED at read
     * time from `dueDate`, so there is no cron job to fall behind and no stale
     * status rows to reconcile.
     */
    status: { type: String, enum: CHORE_STORED_STATUSES, default: 'pending' },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    /** Idempotency guard: ensures XP is credited exactly once per chore. */
    xpAwarded: { type: Boolean, default: false },

    lastRemindedAt: { type: Date, default: null },
    reminderCount: { type: Number, default: 0, min: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

choreSchema.index({ house: 1, status: 1, dueDate: 1 });
choreSchema.index({ house: 1, assignedTo: 1, status: 1 });
choreSchema.index({ house: 1, completedAt: -1 });
choreSchema.index({ title: 'text', description: 'text' });

/** Pure read-time derivation - the single definition of "overdue". */
choreSchema.methods.derivedStatus = function derivedStatus(now = new Date()) {
  if (this.status === 'completed') return 'completed';
  if (this.dueDate && new Date(this.dueDate).getTime() < now.getTime()) return 'overdue';
  return this.status;
};

const Chore = mongoose.models.Chore || mongoose.model('Chore', choreSchema);

export default Chore;
