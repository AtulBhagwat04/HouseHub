import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.js'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Serial: the API tests share one database and would otherwise trample
    // each other's documents when run in parallel.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: {
      NODE_ENV: 'test',
      MONGO_URI: process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/househub_test',
      JWT_SECRET: 'test-secret-0123456789abcdefghijklmnopqrstuvwxyz',
      JWT_EXPIRES_IN: '1h',
      CLIENT_URL: 'http://localhost:5173',
      BCRYPT_ROUNDS: '4', // keep the suite fast; hashing is not what we're testing
      EMAIL_DEV_MODE: 'true',
      LOG_LEVEL: 'error',
    },
  },
});
