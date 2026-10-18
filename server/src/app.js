import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, healthPayload, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();

/** Behind Render/Vercel, so rate limiting and logs see the real client IP. */
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

/**
 * CORS.
 *
 * Auth uses a Bearer token in an Authorization header rather than a cookie, so
 * `credentials` stays false - which in turn means no wildcard-with-credentials
 * hazards. Vercel preview deployments get their own hostnames, so those are
 * allowed by suffix in production.
 */
function isAllowedOrigin(origin) {
  if (!origin) return true; // curl, Postman, server-to-server
  if (config.clientUrls.includes(origin)) return true;
  if (!config.isProduction && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (!config.isProduction && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;

  if (config.isProduction) {
    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol === 'https:' && hostname.endsWith('.vercel.app')) return true;
    } catch {
      return false;
    }
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86_400,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
}

/** Unauthenticated liveness probe - Render uses this. */
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: healthPayload() });
});

app.use('/api', apiLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
