const { AppError } = require('../../middleware/errorHandler');

const validateApply = (req, res, next) => {
  const { resumeUrl } = req.body;

  if (!resumeUrl) {
    throw new AppError('Resume URL is required to apply for a job', 400);
  }

  next();
};

module.exports = {
  validateApply,
};
