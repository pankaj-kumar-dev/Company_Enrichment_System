'use strict';

require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config');

const server = app.listen(config.port, () => {
  console.log(`[server] running on port ${config.port} [${config.nodeEnv}]`);
});

const shutdown = (signal) => {
  console.log(`[server] ${signal} received — shutting down`);
  server.close(() => {
    console.log('[server] closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason);
  server.close(() => process.exit(1));
});
