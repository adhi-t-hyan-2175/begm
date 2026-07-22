const http = require('http');
const app = require('./app');
const startCronJobs = require('./jobs/cron');
const { startGameEngine } = require('./services/gameEngine');
const logger = require('./utils/logger');

// ─── Environment Validation ──────────────────────────────────────────────────
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`\n🚨 FATAL ERROR: Missing environment variable: ${envVar}\n`);
    process.exit(1);
  }
}

// Global error handlers to keep server responsive even if DB is down
process.on('unhandledRejection', (reason, p) => {
  logger.error({ action: 'Unhandled Rejection', reason: reason && reason.message ? reason.message : reason });
});

process.on('uncaughtException', (err) => {
  logger.error({ action: 'Uncaught Exception', error: err && err.message ? err.message : err });
});

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  logger.info({ action: 'Server Start', status: `Server running on port ${PORT}` });
  startCronJobs();
  startGameEngine();
});
