const mongoose = require('mongoose');
require('dotenv').config();

const logger = require('./utils/logger');
const otpStore = require('./services/otpStore');
const { registerRoutes } = require('./bootstrap/appBootstrap');
const { createSocketServer } = require('./bootstrap/socketBootstrap');
const { createGracefulShutdown } = require('./bootstrap/shutdown');

// Make morgan optional so server startup doesn't crash if dependency is missing.
let morgan;
try {
  morgan = require('morgan');
} catch (err) {
  logger.warn('Optional dependency "morgan" is not installed. Request logging will be disabled.');
  morgan = null;
}

// Initialize Express and HTTP Server
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

// Use morgan if available; otherwise use a no-op middleware to keep behavior consistent.
if (morgan) {
  app.use(morgan('combined'));
} else {
  app.use((req, res, next) => next());
}

app.get('/ready', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1;
    const redisStatus = pubClient && subClient ? (pubClient.status === 'ready' && subClient.status === 'ready') : false;

    if (mongoStatus && (pubClient ? redisStatus : true)) {
      res.status(200).json({ status: 'ready', mongo: true, redis: pubClient ? redisStatus : 'disabled' });
    } else {
      res.status(503).json({ status: 'unready', mongo: mongoStatus, redis: pubClient ? redisStatus : 'disabled' });
    }
  } catch (err) {
    res.status(503).json({ status: 'error', details: err.message });
  }
});

registerRoutes(app);

const { io, pubClient, subClient } = createSocketServer(app, server, logger);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/workconnect';
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB Successfully!');

    if (require.main === module) {
      const PORT = process.env.PORT || 5000;

      // Attach error handler to surface common listen errors (EADDRINUSE, EACCES)
      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          logger.error(`Port ${PORT} already in use. Ensure no other process is listening on this port or set a different PORT environment variable.`, err);
          process.exit(1);
        }
        if (err && err.code === 'EACCES') {
          logger.error(`Insufficient privileges to bind to port ${PORT}. Try a higher port or run with appropriate permissions.`, err);
          process.exit(1);
        }
        logger.error('Server encountered an unexpected error during startup:', err);
        process.exit(1);
      });

      server.listen(PORT, () => {
        logger.info(`WorkConnect Server is running on port ${PORT}`);
      });

      // --- Graceful Shutdown Handling ---
      const gracefulShutdown = createGracefulShutdown({
        server,
        io,
        pubClient,
        subClient,
        otpStore,
        logger,
      });

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  })
  .catch((err) => {
    logger.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
