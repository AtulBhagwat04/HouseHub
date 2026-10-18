import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
/** server/src/config -> server/.env */
export const ENV_FILE = path.resolve(currentDir, '../../.env');

dotenv.config({ path: ENV_FILE });

function asBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',

  port: asInt(process.env.PORT, 5000),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/househub',

  jwt: {
    secret: process.env.JWT_SECRET || 'househub-insecure-development-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  /** Comma separated list. Used for CORS in production (Vercel preview URLs etc). */
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  bcryptRounds: asInt(process.env.BCRYPT_ROUNDS, 12),

  rateLimit: {
    windowMs: asInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: asInt(process.env.RATE_LIMIT_MAX, 600),
    authMax: asInt(process.env.AUTH_RATE_LIMIT_MAX, 30),
  },

  /** Email is not wired up in the MVP; reset links are logged to the console. */
  email: {
    devMode: asBool(process.env.EMAIL_DEV_MODE, nodeEnv !== 'production'),
  },

  /** Receipt uploads stay disabled until Cloudinary credentials exist. */
  cloudinary: {
    enabled: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
    ),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  defaults: {
    currency: 'INR',
    weeklyChoreGoal: asInt(process.env.WEEKLY_CHORE_GOAL, 50),
  },
};

/**
 * Fails fast on a misconfigured deploy rather than booting a subtly broken API.
 * Called from server.js only, so Vitest can import `app` without a real env.
 */
export function assertEnvironment() {
  const problems = [];

  if (config.isProduction) {
    if (!process.env.MONGO_URI) problems.push('MONGO_URI is required in production');
    if (!process.env.JWT_SECRET) problems.push('JWT_SECRET is required in production');
    else if (config.jwt.secret.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
    if (!process.env.CLIENT_URL) problems.push('CLIENT_URL is required in production (CORS origin)');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
  }

  if (!config.isProduction && config.jwt.secret === 'househub-insecure-development-secret') {
    // eslint-disable-next-line no-console
    console.warn('[househub] Using the default development JWT secret. Set JWT_SECRET in server/.env.');
  }
}

export default config;
