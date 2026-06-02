const { AppError } = require('../../middleware/errorHandler');

const validateJobPost = (req, res, next) => {
  const { title, description, skillsRequired, experienceRequired, location, applicationDeadline } = req.body;

  if (!title || !description || !skillsRequired || !experienceRequired || !location || !applicationDeadline) {
    throw new AppError('Job title, description, skillsRequired, experienceRequired, location, and applicationDeadline are required fields', 400);
  }

  next();
};

module.exports = {
  validateJobPost,
};
