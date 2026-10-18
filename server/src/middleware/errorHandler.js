import mongoose from 'mongoose';
import config from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { dbState } from '../config/db.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * The single place errors become HTTP responses.
 *
 * Operational ApiErrors are passed through verbatim. Everything else - Mongoose
 * cast/validation errors, duplicate keys, unknown throws - is translated into a
 * clean, non-leaky message. Stack traces are logged server-side only.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Something went wrong on our end';
  let details = error.details;

  if (!error.isOperational) {
    if (error instanceof mongoose.Error.CastError) {
      statusCode = 400;
      message = `Invalid value for "${error.path}"`;
      details = undefined;
    } else if (error instanceof mongoose.Error.ValidationError) {
      statusCode = 422;
      details = Object.values(error.errors).map((entry) => ({
        field: entry.path,
        message: entry.message,
      }));
      message = details[0]?.message || 'Validation failed';
    } else if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'value';
      message =
        field === 'email'
          ? 'An account with that email already exists'
          : field === 'inviteCode'
            ? 'That invite code is already taken, please try again'
            : `That ${field} is already in use`;
      details = undefined;
    } else if (error.type === 'entity.parse.failed') {
      statusCode = 400;
      message = 'Request body is not valid JSON';
    } else {
      statusCode = 500;
      message = 'Something went wrong on our end';
      details = undefined;
    }
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed:`, error);
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (!config.isProduction && statusCode >= 500) body.debug = error.message;

  return res.status(statusCode).json(body);
}

export function notImplemented(_req, _res, next) {
  next(ApiError.notFound('This endpoint is not part of the MVP yet'));
}

export function healthPayload() {
  return {
    status: 'ok',
    database: dbState(),
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export default { errorHandler, notFoundHandler, notImplemented, healthPayload };
