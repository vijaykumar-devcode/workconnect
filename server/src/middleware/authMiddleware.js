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

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
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
    const currentUser = await User.findById(decoded.id);
    
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
