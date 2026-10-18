import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/env.js';
import { ROLES, THEME_OPTIONS } from '../../../shared/constants.js';

const { Schema } = mongoose;

const notificationPrefsSchema = new Schema(
  {
    chores: { type: Boolean, default: true },
    expenses: { type: Boolean, default: true },
    settlements: { type: Boolean, default: true },
    achievements: { type: Boolean, default: true },
  },
  { _id: false },
);

const statsSchema = new Schema(
  {
    choresCompleted: { type: Number, default: 0, min: 0 },
    choresAssigned: { type: Number, default: 0, min: 0 },
    choresCreated: { type: Number, default: 0, min: 0 },
    expensesAdded: { type: Number, default: 0, min: 0 },
    expensesPaid: { type: Number, default: 0, min: 0 },
    settlementsCompleted: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const unlockedAchievementSchema = new Schema(
  {
    achievement: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true },
    unlockedAt: { type: Date, default: Date.now },
    progressAtUnlock: { type: Number, default: 0 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    avatarUrl: { type: String, default: '', trim: true },

    /** A user belongs to exactly one house in the MVP. */
    house: { type: Schema.Types.ObjectId, ref: 'House', default: null },

    xp: { type: Number, default: 0, min: 0 },
    /** Denormalised from shared/levels.js so leaderboards can sort server-side. */
    level: { type: Number, default: 1, min: 1 },

    stats: { type: statsSchema, default: () => ({}) },
    achievements: { type: [unlockedAchievementSchema], default: [] },

    notificationPrefs: { type: notificationPrefsSchema, default: () => ({}) },
    theme: { type: String, enum: THEME_OPTIONS, default: 'system' },

    isPlatformAdmin: { type: Boolean, default: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    lastActiveAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

/** Leaderboard ordering: most XP wins, ties broken by chores completed, then name. */
userSchema.index({ house: 1, xp: -1 });
userSchema.index({ house: 1, 'stats.choresCompleted': -1 });

userSchema.virtual('role').get(function roleVirtual() {
  return this.__role || 'member';
});

userSchema.methods.setRole = function setRole(role) {
  if (!ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  this.__role = role;
  return this;
};

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, config.bcryptRounds);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(String(candidate), this.password);
};

/** Lifetime XP plus a settled marker, used by the dashboard header. */
userSchema.methods.hasAchievement = function hasAchievement(achievementId) {
  const id = String(achievementId);
  return this.achievements.some((entry) => String(entry.achievement) === id);
};

/** `mongoose.models.X ||` keeps registration idempotent across test-file reloads. */
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
