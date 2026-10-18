import config, { assertEnvironment } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';

async function start() {
  try {
    assertEnvironment();
    await connectDB();

    const server = app.listen(config.port, () => {
      logger.info(`HOUSEHUB API listening on http://localhost:${config.port} (${config.nodeEnv})`);
      logger.info(`CORS origins: ${config.clientUrls.join(', ')}`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received - shutting down gracefully`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
      // Don't hang forever on a stuck connection.
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection:', reason);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
}

start();

export default start;
