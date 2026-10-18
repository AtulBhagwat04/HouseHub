import mongoose from 'mongoose';
import House from '../models/House.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * THE HOUSE-LEVEL SECURITY BOUNDARY.
 *
 * Every house-scoped route mounts `houseScope`. That means the ID in the URL is
 * never trusted: we load the house, then prove the caller is on its member list
 * before any controller runs. `GET /api/houses/<someone-elses-id>/expenses`
 * therefore returns 403 rather than leaking data - see tests/security.test.js.
 */

export const loadHouse = asyncHandler(async (req, _res, next) => {
  const rawId = req.params.houseId;

  if (!mongoose.isValidObjectId(rawId)) {
    // A malformed id is indistinguishable from a missing house to the caller.
    throw ApiError.forbidden('You do not have access to this house');
  }

  const house = await House.findById(rawId);
  if (!house) throw ApiError.forbidden('You do not have access to this house');

  req.house = house;
  return next();
});

export const requireHouseMember = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());

  const membership = req.house.getMember(req.user._id);
  if (!membership) {
    return next(ApiError.forbidden('You are not a member of this house'));
  }

  req.membership = membership;
  req.houseRole = membership.role;
  return next();
};

/** Owner or admin only. */
export const requireHouseManager = (req, _res, next) => {
  if (!['owner', 'admin'].includes(req.houseRole)) {
    return next(ApiError.forbidden('Only the house owner or an admin can do that'));
  }
  return next();
};

/** Owner only - used for destructive house actions and role changes. */
export const requireHouseOwner = (req, _res, next) => {
  if (req.houseRole !== 'owner') {
    return next(ApiError.forbidden('Only the house owner can do that'));
  }
  return next();
};

/** Reusable chain: authenticate -> load house -> prove membership. */
export const houseScope = [loadHouse, requireHouseMember];

export default { loadHouse, requireHouseMember, requireHouseManager, requireHouseOwner, houseScope };
