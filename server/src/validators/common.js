import { body, param } from 'express-validator';
import { SPLIT_TYPES, THEME_OPTIONS, EXPENSE_CATEGORY_VALUES, CHORE_PRIORITIES, XP_REWARDS } from '../../../shared/constants.js';
import { MAX_AMOUNT_PAISE } from '../../../shared/money.js';

/** Route-param id checks. */
export const idParam = (name) =>
  param(name).isMongoId().withMessage(`The ${name} in the URL is not valid`);

/** Optional string that may be empty, otherwise a URL. */
export const optionalUrl = (field) =>
  body(field)
    .optional({ values: 'falsy' })
    .isString()
    .withMessage(`${field} must be text`)
    .isLength({ max: 2000 })
    .withMessage(`${field} is too long`);

export const expenseValidators = [
  body('title').trim().isLength({ min: 1, max: 80 }).withMessage('Expense title must be 1-80 characters'),

  /**
   * `amount` is ALWAYS integer paise, never rupees. The client converts with
   * toPaise() and formats with formatPaise() so a float never reaches Mongo.
   */
  body('amount')
    .isInt({ min: 1, max: MAX_AMOUNT_PAISE })
    .withMessage('Amount must be a whole number of paise greater than zero')
    .toInt(),

  body('category').optional().isIn(EXPENSE_CATEGORY_VALUES).withMessage('Unknown expense category'),
  body('splitType').optional().isIn(SPLIT_TYPES).withMessage('Split type must be equal, custom or percentage'),
  body('paidBy').isMongoId().withMessage('Choose who paid'),

  body('participants').isArray({ min: 1 }).withMessage('Select at least one participant'),
  body('participants.*.user').isMongoId().withMessage('Every participant must be a house member'),
  body('participants.*.share').optional().isInt({ min: 0 }).withMessage('Custom shares must be whole paise').toInt(),
  body('participants.*.percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Percentages must be between 0 and 100')
    .toFloat(),

  body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid date'),
  body('description').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Description is too long'),
  optionalUrl('receiptUrl'),
];

export const expenseUpdateValidators = expenseValidators.map((validator) => validator.optional());

export const choreValidators = [
  body('title').trim().isLength({ min: 1, max: 80 }).withMessage('Chore name must be 1-80 characters'),
  body('assignedTo').isMongoId().withMessage('Choose who this chore is for'),
  body('dueDate').isISO8601().withMessage('Enter a valid due date'),
  body('priority').optional().isIn(CHORE_PRIORITIES).withMessage('Priority must be low, medium or high'),
  body('xpReward')
    .optional()
    .isIn(XP_REWARDS.map(String))
    .withMessage(`XP reward must be one of: ${XP_REWARDS.join(', ')}`),
  body('description').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Description is too long'),
];

export const choreUpdateValidators = choreValidators.map((validator) => validator.optional()).concat([
  body('status')
    .optional()
    .isIn(['pending', 'in_progress'])
    .withMessage('Status must be pending or in_progress - use the complete action to finish a chore'),
]);

export const profileValidators = [
  body('name').optional().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  optionalUrl('avatarUrl'),
  body('theme').optional().isIn(THEME_OPTIONS).withMessage('Theme must be light, dark or system'),
];

export const passwordValidators = {
  // bcrypt silently truncates at 72 bytes, so reject longer input explicitly.
  new: body('newPassword').isLength({ min: 8, max: 72 }).withMessage('New password must be 8-72 characters'),
  current: body('currentPassword').isLength({ min: 1 }).withMessage('Enter your current password'),
};

export const amountValidators = [
  body('amount')
    .isInt({ min: 1, max: MAX_AMOUNT_PAISE })
    .withMessage('Amount must be a whole number of paise greater than zero')
    .toInt(),
];
