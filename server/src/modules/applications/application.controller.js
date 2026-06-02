const applicationService = require('./application.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const applyToJob = asyncHandler(async (req, res, next) => {
  const application = await applicationService.applyToJob(req.params.jobId, req.user._id, req.body);
  res.status(201).json({
    success: true,
    message: 'Applied for job successfully',
    data: { application }
  });
});

const getApplications = asyncHandler(async (req, res, next) => {
  const filters = { ...req.query };

  // Set user constraints
  if (req.user.role === 'CANDIDATE') {
    filters.candidateId = req.user._id;
  } else if (req.user.role === 'EMPLOYER') {
    filters.publisherId = req.user._id;
  } else if (req.user.role === 'RECRUITER') {
    filters.assignedRecruiterId = req.user._id;
  }

  const result = await applicationService.getApplications(filters);
  res.status(200).json({
    success: true,
    message: 'Applications list retrieved successfully',
    data: result
  });
});

const getApplicationDetails = asyncHandler(async (req, res, next) => {
  const application = await applicationService.getApplicationById(req.params.applicationId, req.user);
  res.status(200).json({
    success: true,
    message: 'Application details retrieved successfully',
    data: { application }
  });
});

const updateStage = asyncHandler(async (req, res, next) => {
  const { stage } = req.body;
  const application = await applicationService.updateStage(req.params.applicationId, stage, req.user);
  res.status(200).json({
    success: true,
    message: `Application stage changed to ${stage}`,
    data: { application }
  });
});

const updateAssessment = asyncHandler(async (req, res, next) => {
  const { score, status } = req.body;
  const application = await applicationService.updateAssessment(req.params.applicationId, score, status, req.user);
  res.status(200).json({
    success: true,
    message: 'Assessment score/status updated',
    data: { application }
  });
});

const addComment = asyncHandler(async (req, res, next) => {
  const { comment } = req.body;
  const application = await applicationService.addComment(req.params.applicationId, comment, req.user);
  res.status(200).json({
    success: true,
    message: 'Comment added successfully',
    data: { application }
  });
});

const uploadOnboardingDoc = asyncHandler(async (req, res, next) => {
  const { docType, fileUrl } = req.body;
  const application = await applicationService.uploadOnboardingDoc(req.params.applicationId, docType, fileUrl, req.user);
  res.status(200).json({
    success: true,
    message: 'Onboarding document uploaded successfully',
    data: { application }
  });
});

const verifyOnboardingDoc = asyncHandler(async (req, res, next) => {
  const { docId } = req.params;
  const { status } = req.body;
  const application = await applicationService.verifyOnboardingDoc(req.params.applicationId, docId, status, req.user);
  res.status(200).json({
    success: true,
    message: `Document status verified as: ${status}`,
    data: { application }
  });
});

module.exports = {
  applyToJob,
  getApplications,
  getApplicationDetails,
  updateStage,
  updateAssessment,
  addComment,
  uploadOnboardingDoc,
  verifyOnboardingDoc,
};
