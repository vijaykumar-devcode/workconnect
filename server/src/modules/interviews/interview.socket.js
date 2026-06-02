const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const ChatMessage = require('./chatMessage.model');
const WhiteboardEvent = require('./whiteboardEvent.model');
const Interview = require('./interview.model');
const AuditLog = require('../audit/auditLog.model');
const logger = require('../../utils/logger');
const { requireJwtSecret } = require('../../utils/jwtSecrets');

const JWT_SECRET = requireJwtSecret('JWT_SECRET');

// Initialize Redis for Streams (Persistence) only when explicitly enabled
let redisClient = null;
if (process.env.USE_REDIS === 'true') {
  try {
    redisClient = new Redis(process.env.REDIS_URI || 'redis://127.0.0.1:6379');
    redisClient.on('error', (err) => logger.warn('Interview Redis client error:', err && err.message ? err.message : err));
    logger.info('Interview Redis client initialized');
  } catch (err) {
    logger.warn('Failed to initialize Interview Redis client, proceeding without Redis:', err && err.message ? err.message : err);
    redisClient = null;
  }
} else {
  logger.info('Interview Redis client disabled (USE_REDIS not set)');
}

// Simple In-Memory Rate Limiter Map (Production ready for single node, shared via Redis if strict)
const rateLimits = new Map();

const registerInterviewHandlers = (io) => {
  // Socket.IO Hardening: JWT Validation in Handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      logger.warn('Socket connection rejected: No token provided');
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Socket connection rejected: Invalid token');
        return next(new Error('Authentication error'));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user?.id})`);

    // 1. Reconnection & Auth Flow
    socket.on('join_interview_room', async ({ interviewId, userId }) => {
      const roomKey = `interview:${interviewId}`;
      socket.join(roomKey);

      // Audit Log: JOIN_ROOM
      AuditLog.create({ interview: interviewId, user: userId, action: 'JOINED_ROOM' }).catch(err => logger.error('AuditLog Error:', err));

      try {
        // STATE HYDRATION: Fetch all required state to replay
        const interview = await Interview.findById(interviewId);
        const chatHistory = await ChatMessage.find({ interview: interviewId }).sort({ createdAt: 1 }).limit(100);

        // Fetch Whiteboard Events from Redis Streams + DB
        // For brevity, we assume the DB has the latest flushed batch
        const whiteboardBatches = await WhiteboardEvent.find({ interview: interviewId }).sort({ batchSequence: 1 });

        socket.emit('room_state_hydration', {
          chatHistory,
          whiteboardBatches,
          timerState: {
            actualStartTime: interview?.roomMetadata?.actualStartTime,
            actualEndTime: interview?.roomMetadata?.actualEndTime,
            durationMinutes: interview?.duration,
          }
        });
      } catch (err) {
        socket.emit('error', 'Failed to hydrate room state');
      }
    });

    // 2. Chat System with Rate Limiting
    socket.on('chat_message', async ({ interviewId, senderId, content }) => {
      const limitKey = `${senderId}:chat`;
      const lastMsg = rateLimits.get(limitKey);
      if (lastMsg && Date.now() - lastMsg < 500) return; // 500ms rate limit
      rateLimits.set(limitKey, Date.now());

      const roomKey = `interview:${interviewId}`;

      const message = {
        interview: interviewId,
        sender: senderId,
        content,
        createdAt: new Date()
      };

      // Broadcast immediately via Socket.io (which uses Pub/Sub under the hood if redis-adapter is used)
      socket.to(roomKey).emit('chat_message_received', message);

      // Async Batch Save to DB
      try {
        await ChatMessage.create(message);
        AuditLog.create({ interview: interviewId, user: senderId, action: 'CHAT_MESSAGE' }).catch(err => logger.error(err));
      } catch (err) {
        logger.error('Chat persistence error:', err);
      }
    });

    // 3. Whiteboard System (Redis Streams bounded)
    socket.on('whiteboard_event', async ({ interviewId, eventType, payload, senderId }) => {
      const limitKey = `${senderId}:wb`;
      const lastEvent = rateLimits.get(limitKey);
      if (lastEvent && Date.now() - lastEvent < 50) return; // 50ms throttle limit
      rateLimits.set(limitKey, Date.now());

      const roomKey = `interview:${interviewId}`;
      const streamKey = `whiteboard:stream:${interviewId}`;

      const eventData = {
        eventType,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
        senderId,
        timestamp: new Date().toISOString()
      };

      // Broadcast immediately for low latency UI
      socket.to(roomKey).emit('whiteboard_event_received', eventData);

      // Add to Redis Stream for durable persistence (Bounded memory safe)
      try {
        if (redisClient) {
          await redisClient.xadd(streamKey, 'MAXLEN', '~', 10000, '*',
            'eventType', eventData.eventType,
            'payload', eventData.payload,
            'senderId', eventData.senderId,
            'timestamp', eventData.timestamp
          );
        } else {
          // Fallback: persist the event as a WhiteboardEvent batch in MongoDB
          await WhiteboardEvent.create({
            interview: interviewId,
            batchSequence: Date.now(),
            events: [{
              eventType: eventData.eventType,
              payload: JSON.parse(eventData.payload),
              sender: eventData.senderId,
              timestamp: new Date(eventData.timestamp)
            }]
          });
        }
      } catch (err) {
        logger.error('Whiteboard persistence error:', err);
      }
    });

    // 4. Timer System (Server Authoritative)
    socket.on('start_interview_timer', async ({ interviewId }) => {
      const roomKey = `interview:${interviewId}`;
      const interview = await Interview.findById(interviewId);

      if (!interview) return;

      const now = new Date();
      const endTime = new Date(now.getTime() + interview.duration * 60000);

      interview.roomMetadata = {
        ...interview.roomMetadata,
        actualStartTime: now,
        actualEndTime: endTime
      };
      await interview.save();

      io.to(roomKey).emit('timer_sync', {
        actualStartTime: now,
        actualEndTime: endTime
      });
    });

    socket.on('extend_timer', async ({ interviewId, minutes }) => {
      const roomKey = `interview:${interviewId}`;
      const interview = await Interview.findById(interviewId);

      if (!interview || !interview.roomMetadata?.actualEndTime) return;

      const newEndTime = new Date(interview.roomMetadata.actualEndTime.getTime() + minutes * 60000);
      interview.roomMetadata.actualEndTime = newEndTime;
      await interview.save();

      io.to(roomKey).emit('timer_sync', {
        actualEndTime: newEndTime
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      // Clean up rate limits and handle leave logic if necessary
    });
  });
};

module.exports = registerInterviewHandlers;
