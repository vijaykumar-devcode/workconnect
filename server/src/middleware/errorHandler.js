class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode;

  // Handle Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    error = new AppError(message, 400);
  }

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  console.error('ERROR 💥:', err);

  const response = {
    success: false,
    message: error.message || 'Something went wrong',
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(error.statusCode).json(response);
};

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
};
