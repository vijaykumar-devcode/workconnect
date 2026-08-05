const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const ChatMessage = require('./chatMessage.model');
const WhiteboardScene = require('./whiteboardEvent.model'); // Now stores full Excalidraw scenes
const Interview = require('./interview.model');
const InterviewAuditLog = require('../audit/auditLog.model');
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

// In-Memory Rate Limiter Map (Fallback if Redis is disabled)
const rateLimits = new Map();

// Helper to check rate limits, supporting multi-instance deployments via Redis
async function checkRateLimit(key, ms) {
  if (redisClient) {
    try {
      const result = await redisClient.set(key, '1', 'PX', ms, 'NX');
      return result === 'OK';
    } catch (err) {
      logger.warn('Redis rate limit error:', err);
      // Fallback to in-memory if Redis temporarily fails
    }
  }
  const lastSync = rateLimits.get(key);
  if (lastSync && Date.now() - lastSync < ms) return false;
  rateLimits.set(key, Date.now());
  return true;
}

// Helper to clean up local rate limits on disconnect to prevent memory leaks
function cleanupLocalRateLimits(userId) {
  if (!userId) return;
  rateLimits.delete(`${userId}:chat`);
  rateLimits.delete(`${userId}:excalidraw`);
}

// ---------------------------------------------------------------------------
// Helper: safely compute or retrieve the current end time for an interview.
// If the interview timer has not been started yet, it initialises it from
// interview.duration so that extend_timer can work even before an explicit
// start_interview_timer is called.
// Returns the effective (possibly newly created) actualEndTime Date.
// ---------------------------------------------------------------------------
async function ensureTimerStarted(interview) {
  if (interview.roomMetadata?.actualEndTime) {
    return interview.roomMetadata.actualEndTime;
  }

  // Timer has never been started – initialise it now from interview duration.
  const now = new Date();
  const durationMs = (interview.duration || 45) * 60 * 1000;
  const endTime = new Date(now.getTime() + durationMs);

  interview.roomMetadata = {
    ...interview.roomMetadata,
    actualStartTime: interview.roomMetadata?.actualStartTime || now,
    actualEndTime: endTime,
  };
  await interview.save();

  logger.info(`[Timer] Auto-started for interview ${interview._id}. End: ${endTime.toISOString()}`);
  return endTime;
}

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
      socket.user = decoded; // { id, iat, exp }
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
      InterviewAuditLog.create({ interview: interviewId, user: userId, action: 'JOINED_ROOM' }).catch(err => logger.error('InterviewAuditLog Error:', err));

      try {
        // STATE HYDRATION: Fetch all required state to replay
        const interview = await Interview.findById(interviewId);
        const chatHistory = await ChatMessage.find({ interview: interviewId }).sort({ createdAt: 1 }).limit(100);

        // Fetch latest Excalidraw scene snapshot for this interview (if any).
        const sceneDoc = await WhiteboardScene.findOne({ interview: interviewId });

        socket.emit('room_state_hydration', {
          chatHistory,
          excalidrawScene: sceneDoc?.scene ?? null,
          timerState: {
            actualStartTime: interview?.roomMetadata?.actualStartTime ?? null,
            actualEndTime: interview?.roomMetadata?.actualEndTime ?? null,
            durationMinutes: interview?.duration ?? 45,
          },
        });
      } catch (err) {
        logger.error('Room hydration error:', err);
        socket.emit('error', 'Failed to hydrate room state');
      }
    });

    // 2. Chat System with Rate Limiting
    socket.on('chat_message', async ({ interviewId, senderId, content }) => {
      const limitKey = `${senderId}:chat`;
      const allowed = await checkRateLimit(limitKey, 500);
      if (!allowed) return; // 500ms rate limit

      const roomKey = `interview:${interviewId}`;

      const message = {
        interview: interviewId,
        sender: senderId,
        content,
        createdAt: new Date(),
      };

      // Broadcast immediately via Socket.io
      socket.to(roomKey).emit('chat_message_received', message);

      // Async Batch Save to DB
      try {
        await ChatMessage.create(message);
        InterviewAuditLog.create({ interview: interviewId, user: senderId, action: 'CHAT_MESSAGE' }).catch(err => logger.error(err));
      } catch (err) {
        logger.error('Chat persistence error:', err);
      }
    });

    // 3. Excalidraw Scene Sync
    socket.on('excalidraw_sync', async ({ interviewId, scene, senderId }) => {
      if (!scene || typeof scene !== 'string') return;

      // Rate limit: reduced to 50ms to allow client-side throttler to work without dropping the final stroke.
      // This prevents server flooding while maintaining smooth real-time collaboration.
      const limitKey = `${senderId}:excalidraw`;
      const allowed = await checkRateLimit(limitKey, 50);
      if (!allowed) return;

      const roomKey = `interview:${interviewId}`;

      // Broadcast the scene to all OTHER participants in the room immediately.
      socket.to(roomKey).emit('excalidraw_scene_received', { scene });

      // Persist the latest scene as a single upserted document per interview.
      try {
        await WhiteboardScene.findOneAndUpdate(
          { interview: interviewId },
          { scene },
          { upsert: true, new: true }
        );
      } catch (err) {
        logger.error('Excalidraw scene persistence error:', err);
      }
    });

    // 4. Timer System (Server Authoritative)
    // -----------------------------------------------------------------------
    // start_interview_timer — called by the interviewer (non-CANDIDATE) when
    // they open the room and no timer is running yet.  Safe to call multiple
    // times: if a timer is already running it is a no-op (we keep the
    // existing end-time to avoid resetting a partially elapsed session).
    // -----------------------------------------------------------------------
    socket.on('start_interview_timer', async ({ interviewId }) => {
      const roomKey = `interview:${interviewId}`;

      try {
        const interview = await Interview.findById(interviewId);
        if (!interview) {
          logger.warn(`start_interview_timer: interview ${interviewId} not found`);
          return socket.emit('timer_error', { message: 'Interview not found.' });
        }

        // Idempotency guard — do not reset a timer that is already running.
        if (interview.roomMetadata?.actualEndTime) {
          const remaining = interview.roomMetadata.actualEndTime.getTime() - Date.now();
          if (remaining > 0) {
            // Re-sync this socket in case they just (re-)joined.
            return socket.emit('timer_sync', {
              actualStartTime: interview.roomMetadata.actualStartTime,
              actualEndTime: interview.roomMetadata.actualEndTime,
            });
          }
        }

        // Start the timer from scratch.
        const now = new Date();
        const endTime = new Date(now.getTime() + (interview.duration || 45) * 60 * 1000);

        interview.roomMetadata = {
          ...interview.roomMetadata,
          actualStartTime: now,
          actualEndTime: endTime,
        };
        await interview.save();

        // Broadcast to ALL participants (including the sender).
        io.to(roomKey).emit('timer_sync', {
          actualStartTime: now,
          actualEndTime: endTime,
        });

        InterviewAuditLog.create({ interview: interviewId, user: socket.user?.id, action: 'TIMER_STARTED' })
          .catch(err => logger.error('Audit log error:', err));

        logger.info(`[Timer] Started for interview ${interviewId}. End: ${endTime.toISOString()}`);
      } catch (err) {
        logger.error('start_interview_timer error:', err);
        socket.emit('timer_error', { message: 'Failed to start timer. Please try again.' });
      }
    });

    // -----------------------------------------------------------------------
    // extend_timer — called by the interviewer to add time to a live session.
    //
    // Validation:
    //   • minutes must be a positive integer between 1 and 120.
    //   • If no timer is running yet, we auto-start it first so that
    //     "extend by +5m" works even before an explicit start event.
    //
    // The updated end-time is broadcast to ALL room participants and
    // persisted to MongoDB atomically.
    // -----------------------------------------------------------------------
    socket.on('extend_timer', async ({ interviewId, minutes }) => {
      // --- Input validation ---
      const parsedMinutes = parseInt(minutes, 10);
      if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 120) {
        return socket.emit('timer_error', {
          message: 'Invalid value: minutes must be a whole number between 1 and 120.',
        });
      }

      const roomKey = `interview:${interviewId}`;

      try {
        const interview = await Interview.findById(interviewId);
        if (!interview) {
          logger.warn(`extend_timer: interview ${interviewId} not found`);
          return socket.emit('timer_error', { message: 'Interview not found.' });
        }

        // If the timer was never started, auto-start it now so that extend
        // works even if start_interview_timer was never called explicitly.
        const currentEndTime = await ensureTimerStarted(interview);

        // Add the requested minutes to the authoritative server end-time.
        const newEndTime = new Date(currentEndTime.getTime() + parsedMinutes * 60 * 1000);
        interview.roomMetadata.actualEndTime = newEndTime;
        await interview.save();

        // Broadcast the new end-time to ALL participants (including sender).
        io.to(roomKey).emit('timer_sync', { actualEndTime: newEndTime });

        // Audit trail
        InterviewAuditLog.create({
          interview: interviewId,
          user: socket.user?.id,
          action: 'TIMER_EXTENDED',
        }).catch(err => logger.error('Audit log error:', err));

        logger.info(`[Timer] Extended by ${parsedMinutes}m for interview ${interviewId}. New end: ${newEndTime.toISOString()}`);
      } catch (err) {
        logger.error('extend_timer error:', err);
        socket.emit('timer_error', { message: 'Failed to extend timer. Please try again.' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      // Clean up rate limits and handle leave logic to prevent memory leaks
      if (socket.user?.id) {
        cleanupLocalRateLimits(socket.user.id);
      }
    });
  });
};

module.exports = registerInterviewHandlers;
