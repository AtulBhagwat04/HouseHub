import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Achievement *definitions* live in the database (seeded from
 * src/config/achievements.js) so the admin area can eventually toggle them.
 * Which user unlocked what is stored on User.achievements.
 */
const achievementSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    icon: { type: String, default: '\u{1F3C6}' },

    /** Which counter on the user this achievement watches. */
    metric: {
      type: String,
      required: true,
      enum: ['choresCompleted', 'choresCreated', 'expensesAdded', 'settlementsCompleted', 'xp', 'level'],
    },
    target: { type: Number, required: true, min: 1 },

    /** Flavour only - achievements do not hand out XP in the MVP. */
    xpBonus: { type: Number, default: 0, min: 0 },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

achievementSchema.index({ isActive: 1, order: 1 });

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);

export default Achievement;
