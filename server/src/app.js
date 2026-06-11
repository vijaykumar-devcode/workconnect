const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Make morgan optional so server startup doesn't crash if dependency is missing.
let morgan;
try {
  morgan = require('morgan');
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('Optional dependency "morgan" is not installed. Request logging will be disabled.');
  morgan = null;
}
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err)
};

const { errorHandler } = require('./middleware/errorHandler');

// Initialize Express and HTTP Server
const app = express();
const http = require('http');
const server = http.createServer(app);

// Initialize Socket.IO (optionally with Redis Adapter for multi-node scaling)
const { Server } = require('socket.io');
let pubClient = null;
let subClient = null;
let io;

if (process.env.USE_REDIS === 'true') {
  try {
    // Try to initialize Redis-backed adapter if available and reachable
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');

    const redisUrl = process.env.REDIS_URI || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
    // Attach safe error handlers so failures don't throw uncaught exceptions
    pubClient.on('error', (err) => console.warn('Redis pubClient error:', err && err.message ? err.message : err));

    subClient = pubClient.duplicate();
    subClient.on('error', (err) => console.warn('Redis subClient error:', err && err.message ? err.message : err));

    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    io.adapter(createAdapter(pubClient, subClient));
    app.set('io', io); // Make io accessible in controllers/services
    console.info('[INFO] Redis adapter initialized for Socket.IO');
  } catch (err) {
    // If Redis or the adapter isn't available, fall back to in-memory adapter.
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    app.set('io', io);
    console.warn('[WARN] Redis adapter not initialized; using in-memory Socket.IO adapter.');
  }
} else {
  // Default behavior: do not attempt Redis connection unless explicitly enabled.
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  app.set('io', io);
  console.info('[INFO] Redis adapter disabled (USE_REDIS not set). Using in-memory Socket.IO adapter.');
}

// Register Socket Modules
const registerInterviewHandlers = require('./modules/interviews/interview.socket');
registerInterviewHandlers(io);

const { globalLimiter } = require('./middleware/rateLimiter');

// Standard Global Security & Processing Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use morgan if available; otherwise use a no-op middleware to keep behavior consistent.
if (morgan) {
  app.use(morgan('combined'));
} else {
  app.use((req, res, next) => next());
}

// --- Health Check Endpoints ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

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

// Apply rate limiter specifically to all API routes
app.use('/api', globalLimiter);

// Serve Uploads Folder Statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to WorkConnect Recruitment Platform REST API'
  });
});

// Modular Routes Registration
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/upload', require('./modules/upload/upload.routes'));
app.use('/api/companies', require('./modules/companies/company.routes'));
app.use('/api/jobs', require('./modules/jobs/job.routes'));
app.use('/api/applications', require('./modules/applications/application.routes'));
app.use('/api/interviews', require('./modules/interviews/interview.routes'));
app.use('/api/offers', require('./modules/offers/offer.routes'));
app.use('/api/notifications', require('./modules/notifications/notification.routes'));
app.use('/api/support', require('./modules/support/support.routes'));
app.use('/api/analytics', require('./modules/analytics/analytics.routes'));
app.use('/api/audit', require('./modules/audit/audit.routes'));

// Fallback Route
app.all('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Centralized Error Handler Hook
app.use(errorHandler);

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
      const gracefulShutdown = async (signal) => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);

        server.close(() => {
          logger.info('HTTP server closed.');
        });

        io.disconnectSockets(true);
        logger.info('Socket.IO connections severed.');

        try {
          await mongoose.connection.close(false);
          logger.info('MongoDB connection closed.');
          if (pubClient) {
            try {
              await pubClient.quit();
            } catch (err) {
              logger.error('Error quitting Redis pubClient:', err);
            }
          }
          if (subClient) {
            try {
              await subClient.quit();
            } catch (err) {
              logger.error('Error quitting Redis subClient:', err);
            }
          }
          if (pubClient || subClient) logger.info('Redis connections closed.');
        } catch (err) {
          logger.error('Error during database teardown:', err);
        }

        logger.info('Shutdown complete. Exiting.');
        process.exit(0);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
  })
  .catch((err) => {
    logger.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
