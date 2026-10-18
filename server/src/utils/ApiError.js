/**
 * Operational error type. Anything thrown as an ApiError is safe to show to the
 * user verbatim; anything else is swallowed by the error handler and reported
 * as a generic 500 so we never leak stack traces or driver internals.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Invalid request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'You need to sign in to continue') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'That already exists', details) {
    return new ApiError(409, message, details);
  }

  static unprocessable(message = 'Validation failed', details) {
    return new ApiError(422, message, details);
  }

  static tooMany(message = 'Too many requests, please slow down') {
    return new ApiError(429, message);
  }

  static internal(message = 'Something went wrong on our end') {
    return new ApiError(500, message);
  }
}

export default ApiError;
