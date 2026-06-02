const interviewService = require('./interview.service');
const logger = require('../../utils/logger');
const { asyncHandler } = require('../../middleware/errorHandler');

const scheduleInterview = asyncHandler(async (req, res, next) => {
  logger.info('Received scheduleInterview request. req.body:', req.body);
  // Inject logged in employer/recruiter as the default interviewer
  const interviewData = {
    ...req.body,
    interviewerId: req.user._id
  };
  logger.info('Constructed interviewData:', interviewData);

  const interview = await interviewService.scheduleInterview(interviewData, req.user);
  res.status(201).json({
    success: true,
    message: 'Interview scheduled successfully',
    data: { interview }
  });
});

const getInterviews = asyncHandler(async (req, res, next) => {
  const filters = {};

  if (req.user.role === 'CANDIDATE') {
    filters.candidateId = req.user._id;
  } else if (req.user.role === 'RECRUITER' || req.user.role === 'EMPLOYER') {
    filters.companyId = req.user.company;
  }

  const interviews = await interviewService.getInterviews(filters);
  res.status(200).json({
    success: true,
    message: 'Interviews list retrieved successfully',
    data: { interviews }
  });
});

const updateInterview = asyncHandler(async (req, res, next) => {
  const interview = await interviewService.updateInterview(req.params.interviewId, req.body, req.user);
  res.status(200).json({
    success: true,
    message: 'Interview details updated successfully',
    data: { interview }
  });
});

const submitFeedback = asyncHandler(async (req, res, next) => {
  const interview = await interviewService.submitFeedback(req.params.interviewId, req.body, req.user);
  res.status(200).json({
    success: true,
    message: 'Interview feedback and rating submitted successfully',
    data: { interview }
  });
});

const generateLiveKitToken = asyncHandler(async (req, res, next) => {
  const token = await interviewService.generateLiveKitToken(req.params.interviewId, req.user);
  res.status(200).json({
    success: true,
    message: 'LiveKit access token generated successfully',
    data: { token }
  });
});

module.exports = {
  scheduleInterview,
  getInterviews,
  updateInterview,
  submitFeedback,
  generateLiveKitToken,
};
