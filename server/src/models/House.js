import mongoose from 'mongoose';
import config from '../config/env.js';
import { ROLES } from '../../../shared/constants.js';
import { generateInviteCode } from '../utils/inviteCode.js';

const { Schema } = mongoose;

const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLES, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    allowInvites: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    weeklyChoreGoal: { type: Number, default: config.defaults.weeklyChoreGoal, min: 1, max: 500 },
  },
  { _id: false },
);

const houseSchema = new Schema(
  {
    name: { type: String, required: [true, 'House name is required'], trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    imageUrl: { type: String, trim: true, default: '' },

    inviteCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    currency: { type: String, enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'], default: config.defaults.currency },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },

    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

houseSchema.index({ 'members.user': 1 });

/** Invite code is generated here (not by the client) and collisions are retried by the controller. */
houseSchema.pre('validate', function ensureInviteCode(next) {
  if (!this.inviteCode) this.inviteCode = generateInviteCode();
  next();
});

houseSchema.methods.getMember = function getMember(userId) {
  const id = String(userId);
  return this.members.find((member) => String(member.user?._id || member.user) === id) || null;
};

houseSchema.methods.roleOf = function roleOf(userId) {
  return this.getMember(userId)?.role || null;
};

houseSchema.methods.isOwner = function isOwner(userId) {
  return String(this.owner) === String(userId);
};

houseSchema.methods.canManage = function canManage(userId) {
  const role = this.roleOf(userId);
  return role === 'owner' || role === 'admin';
};

houseSchema.methods.memberIds = function memberIds() {
  return this.members.map((member) => String(member.user?._id || member.user));
};

const House = mongoose.models.House || mongoose.model('House', houseSchema);

export default House;
