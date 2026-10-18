import { xpProgress } from '../../../shared/levels.js';
import { toRupees } from '../../../shared/money.js';

/**
 * Response shaping. Keeping this in one file means the client only ever sees
 * one shape per entity, and it is impossible to accidentally serialise a
 * password hash or an internal field.
 */

export function serializeUser(user, { role = null, joinedAt = null, includeEmail = false } = {}) {
  if (!user) return null;
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;
  const progress = xpProgress(plain.xp || 0);

  const payload = {
    _id: String(plain._id),
    name: plain.name,
    avatarUrl: plain.avatarUrl || '',
    xp: plain.xp || 0,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    xpToNextLevel: progress.xpToNextLevel,
    progress: progress.progress,
    houseId: plain.house ? String(plain.house._id || plain.house) : null,
    createdAt: plain.createdAt,
  };

  if (includeEmail) payload.email = plain.email;
  if (role) payload.role = role;
  if (joinedAt) payload.joinedAt = joinedAt;
  if (plain.stats) payload.stats = { ...plain.stats };
  if (plain.notificationPrefs) payload.notificationPrefs = { ...plain.notificationPrefs };
  if (plain.theme) payload.theme = plain.theme;

  return payload;
}

/** The authenticated user's own profile - the only place the email is exposed. */
export function serializeSelf(user) {
  const plain = typeof user.toObject === 'function' ? user.toObject() : user;
  const progress = xpProgress(plain.xp || 0);
  return {
    ...serializeUser(plain, { includeEmail: true }),
    level: progress.level,
    achievements: (plain.achievements || []).map((entry) => ({
      achievement: String(entry.achievement?._id || entry.achievement),
      unlockedAt: entry.unlockedAt,
      progressAtUnlock: entry.progressAtUnlock,
    })),
  };
}

export function serializeHouse(house, { membership = null } = {}) {
  const plain = typeof house.toObject === 'function' ? house.toObject() : house;
  return {
    _id: String(plain._id),
    name: plain.name,
    description: plain.description || '',
    location: plain.location || '',
    imageUrl: plain.imageUrl || '',
    currency: plain.currency || 'INR',
    inviteCode: plain.inviteCode,
    ownerId: String(plain.owner?._id || plain.owner),
    memberCount: (plain.members || []).length,
    settings: plain.settings ? { ...plain.settings } : {},
    myRole: membership?.role || null,
    createdAt: plain.createdAt,
  };
}

export function serializeMember(user, membership, { balancePaise = null } = {}) {
  return {
    ...serializeUser(user, { role: membership?.role, joinedAt: membership?.joinedAt, includeEmail: true }),
    balance: balancePaise,
  };
}

export function serializeExpense(expense) {
  const plain = typeof expense.toObject === 'function' ? expense.toObject() : expense;
  return {
    _id: String(plain._id),
    houseId: String(plain.house?._id || plain.house),
    title: plain.title,
    amount: plain.amount,
    amountRupees: toRupees(plain.amount),
    category: plain.category,
    splitType: plain.splitType,
    date: plain.date,
    description: plain.description || '',
    receiptUrl: plain.receiptUrl || '',
    paidBy: plain.paidBy && plain.paidBy.name ? serializeUser(plain.paidBy) : String(plain.paidBy?._id || plain.paidBy),
    participants: (plain.participants || []).map((participant) => ({
      user: participant.user && participant.user.name ? serializeUser(participant.user) : String(participant.user?._id || participant.user),
      share: participant.share,
      shareRupees: toRupees(participant.share),
    })),
    createdBy: plain.createdBy && plain.createdBy.name ? serializeUser(plain.createdBy) : String(plain.createdBy?._id || plain.createdBy),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export function serializeSettlement(settlement) {
  const plain = typeof settlement.toObject === 'function' ? settlement.toObject() : settlement;
  return {
    _id: String(plain._id),
    houseId: String(plain.house?._id || plain.house),
    from: plain.from && plain.from.name ? serializeUser(plain.from) : String(plain.from?._id || plain.from),
    to: plain.to && plain.to.name ? serializeUser(plain.to) : String(plain.to?._id || plain.to),
    amount: plain.amount,
    amountRupees: toRupees(plain.amount),
    note: plain.note || '',
    status: plain.status,
    rejectionReason: plain.rejectionReason || '',
    requestedBy: plain.requestedBy && plain.requestedBy.name ? serializeUser(plain.requestedBy) : String(plain.requestedBy?._id || plain.requestedBy),
    resolvedBy: plain.resolvedBy && plain.resolvedBy.name ? serializeUser(plain.resolvedBy) : plain.resolvedBy ? String(plain.resolvedBy?._id || plain.resolvedBy) : null,
    resolvedAt: plain.resolvedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export function serializeChore(chore) {
  const plain = typeof chore.toObject === 'function' ? chore.toObject() : chore;
  const now = new Date();
  const storedStatus = plain.status;
  const isOverdue =
    storedStatus !== 'completed' && plain.dueDate && new Date(plain.dueDate).getTime() < now.getTime();

  return {
    _id: String(plain._id),
    houseId: String(plain.house?._id || plain.house),
    title: plain.title,
    description: plain.description || '',
    assignedTo: plain.assignedTo && plain.assignedTo.name ? serializeUser(plain.assignedTo) : String(plain.assignedTo?._id || plain.assignedTo),
    dueDate: plain.dueDate,
    priority: plain.priority,
    xpReward: plain.xpReward,
    status: storedStatus,
    derivedStatus: storedStatus === 'completed' ? 'completed' : isOverdue ? 'overdue' : storedStatus,
    isOverdue,
    startedAt: plain.startedAt,
    completedAt: plain.completedAt,
    completedBy: plain.completedBy && plain.completedBy.name ? serializeUser(plain.completedBy) : plain.completedBy ? String(plain.completedBy?._id || plain.completedBy) : null,
    xpAwarded: Boolean(plain.xpAwarded),
    createdBy: plain.createdBy && plain.createdBy.name ? serializeUser(plain.createdBy) : String(plain.createdBy?._id || plain.createdBy),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

export function serializeNotification(notification) {
  const plain = typeof notification.toObject === 'function' ? notification.toObject() : notification;
  return {
    _id: String(plain._id),
    type: plain.type,
    title: plain.title,
    message: plain.message || '',
    link: plain.link || '',
    read: Boolean(plain.read),
    actor: plain.actor && plain.actor.name ? serializeUser(plain.actor) : null,
    meta: plain.meta || {},
    createdAt: plain.createdAt,
  };
}

export function serializeActivity(activity) {
  const plain = typeof activity.toObject === 'function' ? activity.toObject() : activity;
  return {
    _id: String(plain._id),
    type: plain.type,
    message: plain.message,
    actor: plain.actor && plain.actor.name ? serializeUser(plain.actor) : null,
    meta: plain.meta || {},
    createdAt: plain.createdAt,
  };
}

export function serializeAchievement(definition, { progress = null, unlockedAt = null } = {}) {
  const plain = typeof definition.toObject === 'function' ? definition.toObject() : definition;
  const current = progress?.current ?? 0;
  const target = plain.target;
  return {
    _id: String(plain._id),
    code: plain.code,
    name: plain.name,
    description: plain.description,
    icon: plain.icon,
    metric: plain.metric,
    target,
    order: plain.order ?? 0,
    progress: Math.min(1, target > 0 ? current / target : 0),
    current,
    unlocked: Boolean(unlockedAt),
    unlockedAt,
  };
}

export default {
  serializeUser,
  serializeSelf,
  serializeHouse,
  serializeMember,
  serializeExpense,
  serializeSettlement,
  serializeChore,
  serializeNotification,
  serializeActivity,
  serializeAchievement,
};
