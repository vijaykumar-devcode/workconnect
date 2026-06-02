const analyticsService = require('./analytics.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const getDashboardAnalytics = asyncHandler(async (req, res, next) => {
  let result = {};

  if (req.user.role === 'ADMIN') {
    result = await analyticsService.getAdminAnalytics();
  } else if (req.user.role === 'EMPLOYER') {
    result = await analyticsService.getEmployerAnalytics(req.user._id);
  } else if (req.user.role === 'RECRUITER') {
    result = await analyticsService.getRecruiterAnalytics(req.user._id);
  } else if (req.user.role === 'CANDIDATE') {
    result = await analyticsService.getCandidateAnalytics(req.user._id);
  }

  res.status(200).json({
    success: true,
    message: 'Dashboard analytics retrieved successfully',
    data: result
  });
});

module.exports = {
  getDashboardAnalytics,
};
