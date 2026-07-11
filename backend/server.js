const http = require('http');
const app = require('./app');
const startCronJobs = require('./jobs/cron');

// Global error handlers to keep server responsive even if DB is down
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason && reason.message ? reason.message : reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.message ? err.message : err);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  startCronJobs();
});
