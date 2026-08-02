const jwt = require('jsonwebtoken');
const User = require('../modules/auth/user.model');
const { AppError, asyncHandler } = require('./errorHandler');
const { requireJwtSecret } = require('../utils/jwtSecrets');

const JWT_SECRET = requireJwtSecret('JWT_SECRET');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('You are not logged in. Please log in to get access.', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check Redis Cache first
    const { getRedisClient } = require('../services/redisClient');
    const redisClient = getRedisClient();
    let currentUser;
    const cacheKey = `workconnect:user:${decoded.id}`;

    if (redisClient) {
      const cachedUser = await redisClient.get(cacheKey);
      if (cachedUser) {
        currentUser = JSON.parse(cachedUser);
      }
    }

    if (!currentUser) {
      // Check if user still exists in DB
      currentUser = await User.findById(decoded.id).lean();
      if (!currentUser) {
        throw new AppError('The user belonging to this token no longer exists.', 401);
      }
      if (redisClient) {
        // Cache user for 5 minutes
        await redisClient.set(cacheKey, JSON.stringify(currentUser), 'EX', 300);
      }
    }

    // Check status
    if (currentUser.status === 'SUSPENDED') {
      throw new AppError('Your account has been suspended. Please contact support.', 403);
    }
    if (currentUser.status === 'BANNED') {
      throw new AppError('Your account has been banned.', 403);
    }

    // Grant access
    req.user = currentUser;
    next();
  } catch (err) {
    console.error('AUTH_MIDDLEWARE_ERROR:', err);
    throw new AppError('Invalid token or token expired.', 401);
  }
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { getRedisClient } = require('../services/redisClient');
    const redisClient = getRedisClient();
    let currentUser;
    const cacheKey = `workconnect:user:${decoded.id}`;

    if (redisClient) {
      const cachedUser = await redisClient.get(cacheKey);
      if (cachedUser) {
        currentUser = JSON.parse(cachedUser);
      }
    }

    if (!currentUser) {
      currentUser = await User.findById(decoded.id).lean();
      if (currentUser && redisClient) {
        await redisClient.set(cacheKey, JSON.stringify(currentUser), 'EX', 300);
      }
    }
    
    if (currentUser && currentUser.status !== 'SUSPENDED' && currentUser.status !== 'BANNED') {
      req.user = currentUser;
    }
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
};
