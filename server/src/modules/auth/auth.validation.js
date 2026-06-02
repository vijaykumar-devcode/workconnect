const { AppError } = require('../../middleware/errorHandler');

const validateSignup = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Please provide name, email, and password', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  // Validate role if provided
  if (role && !['ADMIN', 'EMPLOYER', 'RECRUITER', 'CANDIDATE'].includes(role)) {
    throw new AppError('Invalid user role', 400);
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  next();
};

module.exports = {
  validateSignup,
  validateLogin,
};
