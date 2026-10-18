import { incrementStats, evaluateAchievements } from './gamificationService.js';
import { createNotification } from './notificationService.js';
import { logActivity } from './activityService.js';
import { formatPaise } from '../../../shared/money.js';

/** The member who did NOT raise the settlement is always the one who confirms it. */
export function counterpartyOf(settlement) {
  const requester = String(settlement.requestedBy?._id || settlement.requestedBy);
  const from = String(settlement.from?._id || settlement.from);
  const to = String(settlement.to?._id || settlement.to);
  return requester === from ? to : from;
}

export async function recordSettlementRequested({ house, settlement, actorId }) {
  await logActivity({
    houseId: house._id,
    actorId,
    type: 'settlement_requested',
    message: `requested a settlement of ${formatPaise(settlement.amount)}`,
    meta: { settlementId: String(settlement._id), amount: settlement.amount },
  });

  const recipientId = counterpartyOf(settlement);
  await createNotification({
    recipientId,
    houseId: house._id,
    actorId,
    type: 'settlement_requested',
    title: 'Settlement needs your confirmation',
    message: `${formatPaise(settlement.amount)} is waiting for you to confirm`,
    link: '/settlements',
    meta: { settlementId: String(settlement._id), amount: settlement.amount },
  });
}

/**
 * Confirming is what actually moves the ledger, so this is where the
 * `settlementsCompleted` counter is credited - for the person who confirmed.
 */
export async function recordSettlementResolved({ house, settlement, actorId, status }) {
  if (status === 'confirmed') {
    await incrementStats(actorId, { settlementsCompleted: 1 });
  }

  await logActivity({
    houseId: house._id,
    actorId,
    type: status === 'confirmed' ? 'settlement_confirmed' : 'settlement_rejected',
    message:
      status === 'confirmed'
        ? `confirmed a settlement of ${formatPaise(settlement.amount)}`
        : `rejected a settlement of ${formatPaise(settlement.amount)}`,
    meta: { settlementId: String(settlement._id), amount: settlement.amount },
  });

  const requesterId = String(settlement.requestedBy?._id || settlement.requestedBy);
  await createNotification({
    recipientId: requesterId,
    houseId: house._id,
    actorId,
    type: status === 'confirmed' ? 'settlement_confirmed' : 'settlement_rejected',
    title: status === 'confirmed' ? 'Settlement confirmed' : 'Settlement rejected',
    message:
      status === 'confirmed'
        ? `${formatPaise(settlement.amount)} has been confirmed`
        : `${formatPaise(settlement.amount)} was rejected${settlement.rejectionReason ? `: ${settlement.rejectionReason}` : ''}`,
    link: '/settlements',
    meta: { settlementId: String(settlement._id), amount: settlement.amount },
  });

  if (status === 'confirmed') {
    await evaluateAchievements(actorId, { houseId: house._id });
  }
}

export default { counterpartyOf, recordSettlementRequested, recordSettlementResolved };
