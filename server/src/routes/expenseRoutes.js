import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { houseScope } from '../middleware/houseAccess.js';
import validate from '../middleware/validate.js';
import { idParam, expenseValidators, expenseUpdateValidators } from '../validators/common.js';
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
} from '../controllers/expenseController.js';

/** mergeParams gives this router access to :houseId from the parent route. */
const router = Router({ mergeParams: true });

router.use(protect, ...houseScope, idParam('houseId'), validate);

router.route('/').get(listExpenses).post(expenseValidators, validate, createExpense);

router
  .route('/:expenseId')
  .get(idParam('expenseId'), validate, getExpense)
  .patch(idParam('expenseId'), validate, expenseUpdateValidators, validate, updateExpense)
  .delete(idParam('expenseId'), validate, deleteExpense);

export default router;
