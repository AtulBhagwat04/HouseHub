import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../../../shared/constants.js';

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    house: { type: Schema.Types.ObjectId, ref: 'House', default: null },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, default: '', maxlength: 300 },

    /** Client route to open when the notification is clicked. */
    link: { type: String, default: '' },

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
