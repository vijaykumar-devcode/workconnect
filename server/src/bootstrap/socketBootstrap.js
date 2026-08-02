const { Server } = require('socket.io');

const registerInterviewHandlers = require('../modules/interviews/interview.socket');
const { getAllowedOrigins } = require('../utils/origins');

const createSocketServer = (app, server, logger) => {
  let pubClient = null;
  let subClient = null;
  let io;
  const allowedOrigins = getAllowedOrigins();
  const socketCors = {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  };

  if (process.env.USE_REDIS === 'true') {
    try {
      const { createAdapter } = require('@socket.io/redis-adapter');
      const Redis = require('ioredis');

      const redisUrl = process.env.REDIS_URI || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
      pubClient.on('error', (err) => logger.warn(`Redis pubClient error: ${err && err.message ? err.message : err}`));

      subClient = pubClient.duplicate();
      subClient.on('error', (err) => logger.warn(`Redis subClient error: ${err && err.message ? err.message : err}`));

      io = new Server(server, {
        cors: socketCors,
      });
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Redis adapter initialized for Socket.IO');
    } catch (err) {
      io = new Server(server, {
        cors: socketCors,
      });
      logger.warn('Redis adapter not initialized; using in-memory Socket.IO adapter.');
    }
  } else {
    io = new Server(server, {
      cors: socketCors,
    });
    logger.info('Redis adapter disabled (USE_REDIS not set). Using in-memory Socket.IO adapter.');
  }

  app.set('io', io);
  registerInterviewHandlers(io);

  return { io, pubClient, subClient };
};

module.exports = {
  createSocketServer,
};