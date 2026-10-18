import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { passwordValidators, profileValidators } from '../validators/common.js';
import {
  changePassword,
  deleteAccount,
  forgotPassword,
  getMe,
  login,
  register,
  resetPassword,
  updateMe,
} from '../controllers/authController.js';

const router = Router();

const emailRule = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address');

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
    emailRule,
    body('password').isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== undefined && value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  validate,
  register,
);

router.post(
  '/login',
  authLimiter,
  [emailRule, body('password').isLength({ min: 1 }).withMessage('Enter your password')],
  validate,
  login,
);

router.post(
  '/forgot-password',
  authLimiter,
  [emailRule],
  validate,
  forgotPassword,
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').isLength({ min: 10 }).withMessage('Reset token is missing'),
    passwordValidators.new,
  ],
  validate,
  resetPassword,
);

router.get('/me', protect, getMe);
router.patch('/me', protect, profileValidators, validate, updateMe);

router.patch(
  '/password',
  protect,
  [passwordValidators.current, passwordValidators.new],
  validate,
  changePassword,
);

router.delete(
  '/me',
  protect,
  [body('password').isLength({ min: 1 }).withMessage('Enter your password to confirm')],
  validate,
  deleteAccount,
);

export default router;
