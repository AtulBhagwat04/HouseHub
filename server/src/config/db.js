import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

/**
 * NOTE ON TRANSACTIONS
 * --------------------
 * HOUSEHUB is developed against a standalone `mongod`, which does not support
 * multi-document transactions (those require a replica set). Every write path
 * is therefore designed to be safe with single-document atomic operations:
 * conditional `findOneAndUpdate` guards make XP awards and chore completion
 * idempotent, and balances are *derived* from expenses + settlements on read
 * rather than cached, so there is no denormalised total that can drift.
 */

let connection;

export async function connectDB(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    // Keep the driver quiet about the deprecated default; we never rely on it.
    autoIndex: !config.isProduction,
  });

  logger.info(`MongoDB connected -> ${mongoose.connection.name}`);
  return connection;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}

export function dbState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

export function isDbReady() {
  return mongoose.connection.readyState === 1;
}

export default connectDB;
