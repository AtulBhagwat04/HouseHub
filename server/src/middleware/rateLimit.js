import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  // Never rate-limit the automated test/smoke suites into failure.
  skip: () => config.isTest,
};

/** Broad protection for the whole API. */
export const apiLimiter = rateLimit({
  ...baseOptions,
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, message: 'Too many requests, please slow down and try again shortly' },
});

/** Much tighter budget for credential endpoints to slow down password guessing. */
export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again' },
});

export default { apiLimiter, authLimiter };
