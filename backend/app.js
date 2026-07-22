require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const healthRoutes = require('./routes/health');
const maintenanceMiddleware = require('./middleware/maintenance');
const logger = require('./utils/logger');

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://begm.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' })); // Prevent oversized payloads

// ─── Maintenance Mode ─────────────────────────────────────────────────────────
app.use(maintenanceMiddleware);

// ─── Rate limiting ──────────────────────────────────────────────────────────────
const { globalApiLimiter, adminLoginLimiter, authLimiter, financialRequestLimiter, bettingLimiter } = require('./middleware/rateLimiter');

// Apply global rate limit
app.use('/api', globalApiLimiter);

// Apply strict limits
app.use('/api/admin/login', adminLoginLimiter);        // 5 attempts / 15 min
app.use('/api/auth/send-otp', authLimiter);            // 5 / min
app.use('/api/wallet/request-recharge', financialRequestLimiter); // 3 / min
app.use('/api/wallet/withdraw', financialRequestLimiter); // 3 / min
app.use('/api/game/place-bet', bettingLimiter);        // 30 / min

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'BETX API is running', status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', routes.auth);
app.use('/api/game', routes.game);
app.use('/api/user', routes.user);
app.use('/api/wallet', routes.wallet);
app.use('/api/admin', routes.admin);
app.use('/api/community', routes.community);
app.use('/api', healthRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
const supabase = require('./config/supabase');
app.use(async (err, req, res, next) => {
  logger.error({ action: 'Unhandled API Error', error: err.message, stack: err.stack, path: req.path });
  try {
    await supabase.from('system_logs').insert({
      type: 'API_ERROR',
      error_message: err.message || 'Unknown error',
      stack_trace: err.stack || null
    });
  } catch (logErr) {
    logger.error({ action: 'Database Log Error', error: logErr.message });
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = app;
