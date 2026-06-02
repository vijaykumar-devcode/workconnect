const { AppError } = require('../../middleware/errorHandler');

const validateCompanyProfile = (req, res, next) => {
  const { name, description, industry, location } = req.body;

  if (!name || !description || !industry || !location) {
    throw new AppError('Company name, description, industry, and location are required', 400);
  }

  next();
};

module.exports = {
  validateCompanyProfile,
};
