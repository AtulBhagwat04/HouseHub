import mongoose from 'mongoose';
import { EXPENSE_CATEGORY_VALUES, SPLIT_TYPES } from '../../../shared/constants.js';

const { Schema } = mongoose;

const participantSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Integer paise. */
    share: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const expenseSchema = new Schema(
  {
    house: { type: Schema.Types.ObjectId, ref: 'House', required: true },
    title: { type: String, required: [true, 'Expense title is required'], trim: true, maxlength: 80 },
    /** Integer paise - never a float, never rupees. */
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, enum: EXPENSE_CATEGORY_VALUES, default: 'other' },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: {
      type: [participantSchema],
      validate: {
        validator(participants) {
          if (!Array.isArray(participants) || participants.length === 0) return false;
          const total = participants.reduce((sum, participant) => sum + (participant.share || 0), 0);
          return total === this.amount;
        },
        message: 'Participant shares must add up to the expense amount exactly',
      },
    },
    splitType: { type: String, enum: SPLIT_TYPES, default: 'equal' },
    date: { type: Date, default: Date.now },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    receiptUrl: { type: String, trim: true, default: '' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

/** Matches the list/filter access patterns used by the Expenses page. */
expenseSchema.index({ house: 1, date: -1 });
expenseSchema.index({ house: 1, category: 1 });
expenseSchema.index({ house: 1, paidBy: 1 });
expenseSchema.index({ house: 1, 'participants.user': 1 });
expenseSchema.index({ title: 'text', description: 'text' });

/** Convenience: who owes what back to the payer, for the detail view. */
expenseSchema.methods.sharesByUser = function sharesByUser() {
  const map = new Map();
  for (const participant of this.participants) {
    map.set(String(participant.user?._id || participant.user), participant.share);
  }
  return map;
};

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);

export default Expense;
