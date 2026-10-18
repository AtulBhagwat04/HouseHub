import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs after a chain of express-validator checks and converts failures into a
 * 422 with a per-field list, so the client can highlight the offending input.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((error) => ({
    field: error.path || error.param,
    message: error.msg,
  }));

  return next(ApiError.unprocessable(details[0]?.message || 'Validation failed', details));
}

export default validate;
