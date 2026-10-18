import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { houseScope } from '../middleware/houseAccess.js';
import validate from '../middleware/validate.js';
import { idParam, choreValidators, choreUpdateValidators } from '../validators/common.js';
import {
  completeChore,
  createChore,
  deleteChore,
  getChore,
  listChores,
  myChores,
  startChore,
  updateChore,
} from '../controllers/choreController.js';

const router = Router({ mergeParams: true });

router.use(protect, ...houseScope, idParam('houseId'), validate);

router.route('/').get(listChores).post(choreValidators, validate, createChore);

/**
 * `/mine` MUST be declared before `/:choreId`, otherwise Express matches
 * "mine" as a chore id and the request 404s inside the id validator.
 */
router.get('/mine', myChores);

router
  .route('/:choreId')
  .get(idParam('choreId'), validate, getChore)
  .patch(idParam('choreId'), validate, choreUpdateValidators, validate, updateChore)
  .delete(idParam('choreId'), validate, deleteChore);

router.post('/:choreId/start', idParam('choreId'), validate, startChore);

/**
 * Completion takes NO body. XP comes from the stored chore document, so a
 * caller cannot influence the award. See completeChoreFlow() for the
 * idempotency guarantees.
 */
router.post('/:choreId/complete', idParam('choreId'), validate, completeChore);

export default router;
