/**
 * Drops every collection in the connected database.
 *
 *   npm run reset-db          # refuses to run in production
 *   npm run reset-db -- --yes # skip the confirmation prompt
 */
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import config from '../src/config/env.js';
import logger from '../src/utils/logger.js';
import { createInterface } from 'node:readline/promises';

async function confirm(question) {
  if (process.argv.includes('--yes')) return true;
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await readline.question(`${question} [y/N] `);
  readline.close();
  return answer.trim().toLowerCase() === 'y';
}

async function main() {
  if (config.isProduction) {
    logger.error('Refusing to reset a production database.');
    process.exit(1);
  }

  await connectDB();
  const databaseName = mongoose.connection.name;

  const agreed = await confirm(`This will DELETE every collection in "${databaseName}". Continue?`);
  if (!agreed) {
    logger.info('Aborted. Nothing was deleted.');
    await disconnectDB();
    process.exit(0);
  }

  await mongoose.connection.dropDatabase();
  logger.info(`Dropped database "${databaseName}".`);
  logger.info('Run `npm run seed` to create fresh demo data.');

  await disconnectDB();
  process.exit(0);
}

main().catch(async (error) => {
  logger.error('Reset failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
