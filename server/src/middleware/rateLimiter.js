const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, shouldUseRedis } = require('../services/redisClient');
const logger = require('../utils/logger');

const getStore = (prefix) => {
  if (shouldUseRedis()) {
    const client = getRedisClient();
    if (client) {
      return new RedisStore({
        sendCommand: (...args) => client.call(...args),
        prefix: `rl:${prefix}:`,
      });
    }
  }
  return undefined; // Falls back to default MemoryStore if Redis is disabled
};

const GLOBAL_LIMIT = 200;
const AUTH_LIMIT = 10;
const OTP_LIMIT = 3;
const SUPPORT_LIMIT = 3;

// Global Limiter - Applies to all standard API routes
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: GLOBAL_LIMIT, // Limit each IP to 200 requests per 1 minute
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('global'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after a minute'
  }
});

// Auth Limiter - Applies strictly to sensitive routes (Login, Signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: AUTH_LIMIT, // Limit each IP to 10 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('auth'),
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  }
});

// OTP Limiter - Applies to OTP verification and password reset
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: OTP_LIMIT, // Limit each IP to 3 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('otp'),
  message: {
    success: false,
    message: 'Too many OTP/reset requests, please try again after 15 minutes'
  }
});

// Support Limiter - Applies to support ticket creation
const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: SUPPORT_LIMIT, // Limit each IP to 3 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('support'),
  message: {
    success: false,
    message: 'Too many support requests, please try again after an hour'
  }
});

module.exports = {
  GLOBAL_LIMIT,
  AUTH_LIMIT,
  OTP_LIMIT,
  SUPPORT_LIMIT,
  globalLimiter,
  authLimiter,
  otpLimiter,
  supportLimiter
};
