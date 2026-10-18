import { Router } from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { houseScope } from '../middleware/houseAccess.js';
import validate from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { amountValidators } from '../validators/common.js';
import {
  cancelSettlement,
  confirmSettlement,
  createSettlement,
  listSettlements,
  rejectSettlement,
  remindSettlement,
} from '../controllers/settlementController.js';

const router = Router({ mergeParams: true });

router.use(protect, ...houseScope, idParam('houseId'), validate);

router.route('/').get(listSettlements).post(
  [
    body('from').isMongoId().withMessage('Choose who is paying'),
    body('to').isMongoId().withMessage('Choose who is receiving'),
    ...amountValidators,
    body('note').optional({ values: 'falsy' }).isLength({ max: 200 }).withMessage('Note is too long'),
  ],
  validate,
  createSettlement,
);

router.post('/:settlementId/confirm', idParam('settlementId'), validate, confirmSettlement);
router.post(
  '/:settlementId/reject',
  idParam('settlementId'),
  [body('reason').optional({ values: 'falsy' }).isLength({ max: 200 }).withMessage('Reason is too long')],
  validate,
  rejectSettlement,
);
router.post('/:settlementId/remind', idParam('settlementId'), validate, remindSettlement);
router.delete('/:settlementId', idParam('settlementId'), validate, cancelSettlement);

export default router;
