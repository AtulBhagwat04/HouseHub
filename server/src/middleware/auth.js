import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function readBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Touch `lastActiveAt` at most once every 5 minutes instead of on every request. */
function touchActivity(user) {
  const last = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  if (Date.now() - last < 5 * 60 * 1000) return;
  user.lastActiveAt = new Date();
  User.updateOne({ _id: user._id }, { $set: { lastActiveAt: user.lastActiveAt } }).catch(() => {});
}

/**
 * Requires a valid JWT. Throws 401 in every failure mode rather than leaking
 * whether a token was malformed, expired, or belonged to a deleted account.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) throw ApiError.unauthorized('You need to sign in to continue');

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Your session has expired, please sign in again');
    }
    throw ApiError.unauthorized('Invalid session token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('This account no longer exists');

  touchActivity(user);
  req.user = user;
  return next();
});

/** Attaches req.user when a token is present, but never rejects. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    // Ignored on purpose - this middleware is for public endpoints.
  }
  return next();
});

export function requirePlatformAdmin(req, _res, next) {
  if (!req.user?.isPlatformAdmin) return next(ApiError.forbidden('Platform admin access required'));
  return next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to do that'));
    }
    return next();
  };
}

export default { protect, optionalAuth, signToken, verifyToken, requireRole, requirePlatformAdmin };
