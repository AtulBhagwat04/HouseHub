import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { houseScope, requireHouseManager, requireHouseOwner } from '../middleware/houseAccess.js';
import validate from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import expenseRoutes from './expenseRoutes.js';
import choreRoutes from './choreRoutes.js';
import settlementRoutes from './settlementRoutes.js';
import {
  createHouse,
  getActivity,
  getAnalytics,
  getBalances,
  getDashboard,
  getHouse,
  getInvite,
  getLeaderboard,
  joinHouse,
  leaveHouse,
  listMembers,
  regenerateInvite,
  removeMember,
  transferOwnership,
  updateHouse,
  updateMemberRole,
} from '../controllers/houseController.js';
import { getAchievements } from '../controllers/achievementController.js';

const router = Router();

/* -------------------------------------------------------------------------- */
/* House lifecycle (no house scope yet - the caller has no house)              */
/* -------------------------------------------------------------------------- */

router.post(
  '/',
  protect,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('House name must be 2-60 characters'),
    body('description').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Description is too long'),
    body('location').optional({ values: 'falsy' }).isLength({ max: 120 }).withMessage('Location is too long'),
    body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP', 'AED']).withMessage('Unsupported currency'),
  ],
  validate,
  createHouse,
);

router.post(
  '/join',
  protect,
  [body('inviteCode').trim().isLength({ min: 4, max: 80 }).withMessage('Enter an invite code or invite link')],
  validate,
  joinHouse,
);

/* -------------------------------------------------------------------------- */
/* Everything below is scoped to one house.                                    */
/* `houseScope` loads the house AND proves membership before any controller    */
/* runs - this is what turns a tampered house id into a 403 instead of a leak. */
/* -------------------------------------------------------------------------- */

router.get('/:houseId', protect, ...houseScope, getHouse);

router.patch(
  '/:houseId',
  protect,
  ...houseScope,
  requireHouseManager,
  [
    body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('House name must be 2-60 characters'),
    body('settings.weeklyChoreGoal').optional().isInt({ min: 1, max: 500 }).withMessage('Weekly goal must be 1-500'),
  ],
  validate,
  updateHouse,
);

router.get('/:houseId/dashboard', protect, ...houseScope, getDashboard);
router.get('/:houseId/balances', protect, ...houseScope, getBalances);
router.get('/:houseId/leaderboard', protect, ...houseScope, getLeaderboard);
router.get('/:houseId/analytics', protect, ...houseScope, getAnalytics);
router.get('/:houseId/activity', protect, ...houseScope, getActivity);
router.get('/:houseId/achievements', protect, ...houseScope, getAchievements);

/* Members ------------------------------------------------------------------ */
router.get('/:houseId/members', protect, ...houseScope, listMembers);

router.patch(
  '/:houseId/members/:userId',
  protect,
  ...houseScope,
  requireHouseOwner,
  [idParam('userId'), body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member')],
  validate,
  updateMemberRole,
);

router.delete('/:houseId/members/:userId', protect, ...houseScope, requireHouseManager, [idParam('userId')], validate, removeMember);

router.post(
  '/:houseId/transfer-ownership',
  protect,
  ...houseScope,
  requireHouseOwner,
  [body('userId').isMongoId().withMessage('Choose the new owner')],
  validate,
  transferOwnership,
);

router.post('/:houseId/leave', protect, ...houseScope, leaveHouse);

/* Invites ------------------------------------------------------------------ */
router.get('/:houseId/invite', protect, ...houseScope, getInvite);
router.post('/:houseId/invite/regenerate', protect, ...houseScope, requireHouseManager, regenerateInvite);

/* Nested resources --------------------------------------------------------- */
router.use('/:houseId/expenses', expenseRoutes);
router.use('/:houseId/chores', choreRoutes);
router.use('/:houseId/settlements', settlementRoutes);

export default router;
