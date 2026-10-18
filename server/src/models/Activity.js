import mongoose from 'mongoose';
import { ACTIVITY_TYPES } from '../../../shared/constants.js';

const { Schema } = mongoose;

/** Append-only house timeline powering the "Recent activity" panel. */
const activitySchema = new Schema(
  {
    house: { type: Schema.Types.ObjectId, ref: 'House', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    message: { type: String, required: true, maxlength: 300 },

    /** e.g. { amount: 240000 } or { choreId, xp: 30 } */
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ house: 1, createdAt: -1 });

const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

export default Activity;
