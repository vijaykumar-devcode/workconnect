const jobService = require('./job.service');
const auditService = require('../audit/audit.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const { optionalAuth } = require('../../middleware/authMiddleware');

const createJob = asyncHandler(async (req, res, next) => {
  const job = await jobService.createJob(req.body, req.user._id);
  res.status(201).json({
    success: true,
    message: 'Job posting created successfully',
    data: { job }
  });
});

const getJobs = asyncHandler(async (req, res, next) => {
  await new Promise(resolve => optionalAuth(req, res, resolve));
  const result = await jobService.queryJobs(req.query, req.user);
  res.status(200).json({
    success: true,
    message: 'Jobs retrieved successfully',
    data: result
  });
});

const getJobDetails = asyncHandler(async (req, res, next) => {
  const job = await jobService.getJobById(req.params.jobId);
  res.status(200).json({
    success: true,
    message: 'Job details retrieved successfully',
    data: { job }
  });
});

const updateJob = asyncHandler(async (req, res, next) => {
  const job = await jobService.editJob(req.params.jobId, req.body, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Job posting updated successfully',
    data: { job }
  });
});

const deleteJob = asyncHandler(async (req, res, next) => {
  await jobService.deleteJob(req.params.jobId, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Job posting deleted successfully',
    data: null
  });
});

const duplicateJob = asyncHandler(async (req, res, next) => {
  const job = await jobService.duplicateJob(req.params.jobId, req.user._id);
  res.status(201).json({
    success: true,
    message: 'Job duplicated successfully',
    data: { job }
  });
});

const assignRecruiter = asyncHandler(async (req, res, next) => {
  const { recruiterId } = req.body;
  const job = await jobService.assignRecruiter(req.params.jobId, recruiterId, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Recruiter assigned to job successfully',
    data: { job }
  });
});

// Admin Controllers
const getAllJobsForAdmin = asyncHandler(async (req, res, next) => {
  const jobs = await jobService.getAllJobsForAdmin();
  res.status(200).json({
    success: true,
    message: 'All system jobs retrieved successfully',
    data: { jobs }
  });
});

const moderateJob = asyncHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const { status } = req.body;
  const job = await jobService.moderateJob(jobId, status);

  // Non-blocking audit log
  let actionEnum = 'JOB_PAUSED';
  if (status === 'Published') actionEnum = 'JOB_PUBLISHED';
  if (status === 'Closed') actionEnum = 'JOB_CLOSED';
  if (status === 'Moderation') actionEnum = 'JOB_HELD';

  auditService.logAction({
    adminId: req.user._id,
    adminName: req.user.name,
    action: actionEnum,
    entityType: 'JOB',
    entityId: job._id,
    details: `Admin changed job status to ${status}`,
    metadata: { jobTitle: job.title, companyId: job.company }
  });

  res.status(200).json({
    success: true,
    message: `Job moderation status set to ${status}`,
    data: { job }
  });
});

module.exports = {
  createJob,
  getJobs,
  getJobDetails,
  updateJob,
  deleteJob,
  duplicateJob,
  assignRecruiter,
  getAllJobsForAdmin,
  moderateJob,
};
