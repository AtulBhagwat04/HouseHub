/**
 * Small levelled logger. No dependency, no transports - just avoid noisy
 * debug output in production and keep a consistent prefix in the logs.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const isProduction = process.env.NODE_ENV === 'production';
const configured = LEVELS[process.env.LOG_LEVEL] ?? (isProduction ? LEVELS.info : LEVELS.debug);

function emit(level, stream, args) {
  if (LEVELS[level] > configured) return;
  stream(`[${new Date().toISOString()}] [${level.toUpperCase()}]`, ...args);
}

const logger = {
  error: (...args) => emit('error', console.error, args),
  warn: (...args) => emit('warn', console.warn, args),
  info: (...args) => emit('info', console.log, args),
  debug: (...args) => emit('debug', console.log, args),
};

export default logger;
