import mongoose from 'mongoose';
import { SETTLEMENT_STATUSES } from '../../../shared/constants.js';

const { Schema } = mongoose;

const settlementSchema = new Schema(
  {
    house: { type: Schema.Types.ObjectId, ref: 'House', required: true },

    /** Who paid. */
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Who received. */
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    /** Integer paise. */
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, maxlength: 200, default: '' },

    status: { type: String, enum: SETTLEMENT_STATUSES, default: 'pending' },

    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 200, default: '' },

    /** Optional link back to an expense this settlement is clearing. */
    relatedExpense: { type: Schema.Types.ObjectId, ref: 'Expense', default: null },

    /** Reminder throttling, so a nudge cannot become harassment. */
    lastRemindedAt: { type: Date, default: null },
    reminderCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

settlementSchema.index({ house: 1, createdAt: -1 });
settlementSchema.index({ house: 1, status: 1 });
settlementSchema.index({ house: 1, from: 1, to: 1 });

settlementSchema.path('to').validate(function notSamePerson(value) {
  return String(value) !== String(this.from);
}, 'Cannot settle a payment with yourself');

const Settlement = mongoose.models.Settlement || mongoose.model('Settlement', settlementSchema);

export default Settlement;
