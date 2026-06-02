const Application = require('./application.model');
const Job = require('../jobs/job.model');
const User = require('../auth/user.model');
const { AppError } = require('../../middleware/errorHandler');
const emailService = require('../../services/emailService');

const loadApplicationForManagedUpdate = async (applicationId) => {
  const application = await Application.findById(applicationId)
    .populate('candidate')
    .populate({
      path: 'job',
      populate: { path: 'company' }
    });

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  return application;
};

const assertManagedApplicationAccess = (application, user, deniedMessage) => {
  if (!user) {
    throw new AppError(deniedMessage, 403);
  }

  const userId = user._id?.toString?.();

  if (user.role === 'ADMIN') {
    return;
  }

  if (user.role === 'EMPLOYER') {
    const publisherId = application.job?.publisher?.toString?.();
    if (publisherId !== userId) {
      throw new AppError(deniedMessage, 403);
    }
    return;
  }

  if (user.role === 'RECRUITER') {
    const assignedRecruiterId = application.job?.assignedRecruiter?.toString?.();
    if (assignedRecruiterId !== userId) {
      throw new AppError(deniedMessage, 403);
    }
    return;
  }

  throw new AppError(deniedMessage, 403);
};

const assertApplicationReadAccess = (application, user) => {
  if (!user) {
    throw new AppError('You are not authorized to view this application', 403);
  }

  if (user.role === 'ADMIN') {
    return;
  }

  const userId = user._id?.toString?.();

  if (user.role === 'CANDIDATE') {
    if (application.candidate?._id?.toString?.() !== userId && application.candidate?.toString?.() !== userId) {
      throw new AppError('You are not authorized to view this application', 403);
    }
    return;
  }

  if (user.role === 'EMPLOYER') {
    if (application.job?.publisher?.toString?.() !== userId) {
      throw new AppError('You are not authorized to view this application', 403);
    }
    return;
  }

  if (user.role === 'RECRUITER') {
    if (application.job?.assignedRecruiter?.toString?.() !== userId) {
      throw new AppError('You are not authorized to view this application', 403);
    }
    return;
  }

  throw new AppError('You are not authorized to view this application', 403);
};

class ApplicationService {
  async applyToJob(jobId, candidateId, applicationData) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job not found', 404);
    }
    if (job.status !== 'Published') {
      throw new AppError('This job is not accepting applications', 400);
    }

    // Check if candidate already applied
    const alreadyApplied = await Application.findOne({ job: jobId, candidate: candidateId });
    if (alreadyApplied) {
      throw new AppError('You have already applied for this job', 400);
    }

    const application = await Application.create({
      job: jobId,
      candidate: candidateId,
      resumeUrl: applicationData.resumeUrl,
      coverLetter: applicationData.coverLetter,
      currentStage: 'Applied',
      stageHistory: [{ stage: 'Applied', updatedBy: candidateId }]
    });

    // Trigger Job Application Email
    const candidate = await User.findById(candidateId);
    if (candidate) {
      emailService.applicationEmail(candidate, job.title);
    }

    return application;
  }

  async getApplications(filters) {
    const query = {};

    if (filters.jobId) query.job = filters.jobId;
    if (filters.candidateId) query.candidate = filters.candidateId;
    if (filters.currentStage) query.currentStage = filters.currentStage;

    // Filters for Employer viewing applications of their posted jobs
    if (filters.publisherId) {
      const publisherJobs = await Job.find({ publisher: filters.publisherId }).select('_id');
      query.job = { $in: publisherJobs.map(j => j._id) };
    }

    // Filters for Recruiter viewing applications of assigned jobs
    if (filters.assignedRecruiterId) {
      const recruiterJobs = await Job.find({ assignedRecruiter: filters.assignedRecruiterId }).select('_id');
      query.job = { $in: recruiterJobs.map(j => j._id) };
    }

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const applications = await Application.find(query)
      .populate('job', 'title location workMode company')
      .populate('candidate', 'name email phone experience skills education')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Application.countDocuments(query);

    return {
      applications,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  async getApplicationById(id, user) {
    const application = await Application.findById(id)
      .populate('job')
      .populate('candidate', '-password')
      .populate('stageHistory.updatedBy', 'name role')
      .populate('internalComments.author', 'name role');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    assertApplicationReadAccess(application, user);

    return application;
  }

  async updateStage(applicationId, newStage, user) {
    const application = await loadApplicationForManagedUpdate(applicationId);
    assertManagedApplicationAccess(application, user, 'You are not authorized to update this application stage');

    application.currentStage = newStage;
    application.stageHistory.push({
      stage: newStage,
      updatedBy: user._id,
      updatedAt: new Date()
    });

    await application.save();

    // Trigger emails based on new ATS stage
    if (newStage === 'Rejected' && application.candidate) {
      emailService.rejectionEmail(application.candidate, application.job?.title);
    } else if (newStage === 'Onboarded' && application.candidate) {
      const companyName = application.job?.company?.name || 'WorkConnect Partner';
      emailService.onboardingEmail(application.candidate, companyName);
    }

    return application;
  }

  async updateAssessment(applicationId, score, status, user) {
    const application = await loadApplicationForManagedUpdate(applicationId);
    assertManagedApplicationAccess(application, user, 'You are not authorized to update this application assessment');

    if (score !== undefined) application.assessmentScore = score;
    if (status !== undefined) application.assessmentStatus = status;

    await application.save();
    return application;
  }

  async addComment(applicationId, commentText, user) {
    const application = await loadApplicationForManagedUpdate(applicationId);
    assertManagedApplicationAccess(application, user, 'You are not authorized to add comments to this application');

    application.internalComments.push({
      comment: commentText,
      author: user._id
    });

    await application.save();
    return application;
  }

  async uploadOnboardingDoc(applicationId, docType, fileUrl, user) {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (!user || application.candidate?.toString?.() !== user._id?.toString?.()) {
      throw new AppError('You are not authorized to upload documents for this application', 403);
    }

    application.onboardingDocuments.push({
      docType,
      fileUrl,
      status: 'Pending'
    });

    await application.save();
    return application;
  }

  async verifyOnboardingDoc(applicationId, docId, status, user) {
    const application = await loadApplicationForManagedUpdate(applicationId);
    assertManagedApplicationAccess(application, user, 'You are not authorized to verify onboarding documents for this application');

    const doc = application.onboardingDocuments.id(docId);
    if (!doc) {
      throw new AppError('Document not found', 404);
    }

    doc.status = status;
    await application.save();

    return application;
  }
}

module.exports = new ApplicationService();

