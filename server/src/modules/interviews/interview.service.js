const mongoose = require('mongoose');
const Interview = require('./interview.model');
const Application = require('../applications/application.model');
const { AppError } = require('../../middleware/errorHandler');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

class InterviewService {
  async scheduleInterview(interviewData, user) {
    const { applicationId, interviewerId, date, duration, link, type } = interviewData;

    const application = await Application.findById(applicationId).populate('candidate').populate('job');
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (!user || (user.role !== 'ADMIN' && application.job?.company?.toString?.() !== user.company?.toString?.())) {
      throw new AppError('You are not authorized to schedule an interview for this company', 403);
    }

    const interview = await Interview.create({
      application: applicationId,
      candidate: application.candidate?._id,
      interviewer: interviewerId,
      date,
      duration,
      link,
      type,
      roomType: interviewData.roomType || 'EXTERNAL',
      roomMetadata: interviewData.roomType === 'INTERNAL_ROOM' ? {
        livekitRoomName: `room-${new mongoose.Types.ObjectId()}`
      } : undefined
    });

    // Automatically transition application stage to match interview
    application.currentStage = 'Interview Round 1';
    application.stageHistory.push({
      stage: 'Interview Round 1',
      updatedBy: interviewerId,
      updatedAt: new Date()
    });
    await application.save();

    // Trigger Interview Invite Email
    if (application.candidate && application.job) {
      await emailService.interviewEmail(application.candidate, application.job.title, interview);
    }

    return interview;
  }


  async updateInterview(interviewId, updateData, user) {
    let interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    if (!user || (user.role !== 'ADMIN' && interview.interviewer?.toString?.() !== user._id?.toString?.())) {
      throw new AppError('You are not authorized to modify this interview', 403);
    }

    interview = await Interview.findByIdAndUpdate(
      interviewId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return interview;
  }

  async getInterviews(filters) {
    const query = {};

    if (filters.candidateId) query.candidate = filters.candidateId;
    if (filters.interviewerId) query.interviewer = filters.interviewerId;
    if (filters.applicationId) query.application = filters.applicationId;

    if (filters.companyId) {
      const Job = require('../jobs/job.model');
      const jobs = await Job.find({ company: filters.companyId }).select('_id');
      const jobIds = jobs.map(j => j._id);

      const applications = await Application.find({ job: { $in: jobIds } }).select('_id');
      const appIds = applications.map(a => a._id);

      query.application = { $in: appIds };
    }

    return await Interview.find(query)
      .populate('application')
      .populate('candidate', 'name email phone')
      .populate('interviewer', 'name email')
      .sort({ date: 1 });
  }

  async submitFeedback(interviewId, feedbackData, user) {
    const { feedback, rating } = feedbackData;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    if (!user || (user.role !== 'ADMIN' && interview.interviewer?.toString?.() !== user._id?.toString?.())) {
      throw new AppError('You are not authorized to submit feedback for this interview', 403);
    }

    interview.feedback = feedback;
    interview.rating = rating;
    interview.status = 'Completed';

    await interview.save();
    return interview;
  }

  async generateLiveKitToken(interviewId, user) {
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    // Security Rule: Validate user role and participation
    if (user.role === 'CANDIDATE' && interview.candidate?.toString?.() !== user._id.toString()) {
      throw new AppError('Unauthorized access to this interview room', 403);
    }
    if (['RECRUITER', 'EMPLOYER'].includes(user.role) && interview.interviewer?.toString?.() !== user._id.toString()) {
      throw new AppError('Unauthorized access to this interview room', 403);
    }

    if (interview.roomType !== 'INTERNAL_ROOM') {
      throw new AppError('This interview is an external meeting, no internal room available.', 400);
    }

    const { AccessToken } = require('livekit-server-sdk');
    const roomName = interview.roomMetadata?.livekitRoomName || `room-${interviewId}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new AppError('LiveKit API Key and Secret must be configured in environment variables', 500);
    }
    logger.info(`[LiveKit Debug] Using API Key: "${apiKey}", Secret length: ${apiSecret.length}, Room: ${roomName}`);

    // Short-lived token (10 minutes)
    const at = new AccessToken(
      apiKey,
      apiSecret,
      {
        identity: user._id.toString(),
        name: user.name,
        ttl: '10m', // 10 minutes TTL Security Rule
      }
    );

    at.addGrant({ roomJoin: true, room: roomName });

    return at.toJwt();
  }
}

module.exports = new InterviewService();
