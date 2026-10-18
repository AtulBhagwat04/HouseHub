import mongoose from 'mongoose';
import { connectDB } from '../../src/config/db.js';

/**
 * Shared database lifecycle for the API tests.
 *
 * The suite runs against a separate database (househub_test, set in
 * vitest.config.js) so a stray test can never touch development data.
 */

export async function connectTestDb() {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
  // Make sure every model's collection exists before the first clear.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.init().catch(() => {})));
}

export async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function closeTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export default { connectTestDb, clearTestDb, closeTestDb };
