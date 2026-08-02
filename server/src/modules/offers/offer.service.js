const Offer = require('./offer.model');
const Application = require('../applications/application.model');
const { AppError } = require('../../middleware/errorHandler');
const emailService = require('../../services/emailService');

const getEntityId = (value) => value?._id?.toString?.() || value?.toString?.();

const getOfferCompanyId = (offer) => getEntityId(offer.application?.job?.company);

const getUserCompanyId = (user) => getEntityId(user?.company);

const assertCompanyScopedOfferAccess = (offer, user) => {
  if (!user) {
    throw new AppError('You are not authorized to access this offer', 403);
  }

  if (user.role === 'ADMIN') {
    return;
  }

  const offerCandidateId = getEntityId(offer.candidate);
  const userId = getEntityId(user._id);

  if (user.role === 'CANDIDATE') {
    if (offerCandidateId !== userId) {
      throw new AppError('You are not authorized to access this offer', 403);
    }
    return;
  }

  if (['EMPLOYER', 'RECRUITER'].includes(user.role)) {
    const offerCompanyId = getOfferCompanyId(offer);
    const userCompanyId = getUserCompanyId(user);

    if (!userCompanyId || offerCompanyId !== userCompanyId) {
      throw new AppError('You are not authorized to access this offer', 403);
    }
    return;
  }

  throw new AppError('You are not authorized to access this offer', 403);
};

const populateOffer = async (offerId) => {
  const offer = await Offer.findById(offerId)
    .populate({
      path: 'application',
      populate: { path: 'job', populate: { path: 'company' } }
    })
    .populate('candidate', 'name email phone');

  if (!offer) {
    throw new AppError('Offer details not found', 404);
  }

  return offer;
};

const assertOfferAccess = (offer, user) => {
  assertCompanyScopedOfferAccess(offer, user);
};

const assertOfferCreationAccess = (application, user) => {
  if (!user) {
    throw new AppError('You are not authorized to create this offer', 403);
  }

  if (user.role === 'ADMIN') {
    return;
  }

  if (!['EMPLOYER', 'RECRUITER'].includes(user.role)) {
    throw new AppError('You are not authorized to create this offer', 403);
  }

  const applicationCompanyId = getEntityId(application.job?.company);
  const userCompanyId = getUserCompanyId(user);

  if (!userCompanyId || !applicationCompanyId || applicationCompanyId !== userCompanyId) {
    throw new AppError('You are not authorized to create this offer', 403);
  }
};

const assertOfferStatusAccess = (offer, user, status) => {
  assertCompanyScopedOfferAccess(offer, user);

  if (user.role === 'ADMIN') {
    return;
  }

  if (user.role === 'CANDIDATE') {
    if (!['Accepted', 'Rejected'].includes(status)) {
      throw new AppError('You are not authorized to perform this offer action', 403);
    }
    return;
  }

  if (['EMPLOYER', 'RECRUITER'].includes(user.role)) {
    if (!['Sent', 'Viewed', 'Expired', 'Withdrawn'].includes(status)) {
      throw new AppError('You are not authorized to perform this offer action', 403);
    }
    return;
  }

  throw new AppError('You are not authorized to perform this offer action', 403);
};

class OfferService {
  async createOffer(offerData, user) {
    const { applicationId, salary, bonus, joiningDate, benefits, notes, status } = offerData;

    const application = await Application.findById(applicationId).populate('candidate').populate('job');
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    assertOfferCreationAccess(application, user);

    const offer = await Offer.create({
      application: applicationId,
      candidate: application.candidate?._id,
      salary,
      bonus,
      joiningDate,
      benefits,
      notes,
      status: status || 'Draft'
    });

    if (status === 'Sent') {
      application.currentStage = 'Offer Sent';
      application.stageHistory.push({
        stage: 'Offer Sent',
        updatedBy: user._id,
        updatedAt: new Date()
      });
      await application.save();

      // Trigger Job Offer Email
      if (application.candidate && application.job) {
        await emailService.offerEmail(application.candidate, application.job.title, offer);
      }
    }

    return offer;
  }


  async updateOfferStatus(offerId, status, user) {
    const offer = await populateOffer(offerId);
    assertOfferStatusAccess(offer, user, status);

    // Audit fields: who updated status and their role source
    offer.status = status;
    offer.statusUpdatedBy = user._id;
    // Map role to statusSource enum
    if (user.role === 'CANDIDATE') offer.statusSource = 'CANDIDATE';
    else if (user.role === 'EMPLOYER') offer.statusSource = 'EMPLOYER';
    else if (user.role === 'RECRUITER') offer.statusSource = 'RECRUITER';
    else if (user.role === 'ADMIN') offer.statusSource = 'ADMIN';

    await offer.save();

    if (['Accepted', 'Rejected'].includes(status)) {
      const application = await Application.findById(offer.application);
      if (application) {
        let nextStage = 'Selected';
        if (status === 'Accepted') {
          nextStage = 'Offer Accepted';
        } else if (status === 'Rejected') {
          nextStage = 'Rejected';
        }

        application.currentStage = nextStage;
        application.stageHistory.push({
          stage: nextStage,
          updatedBy: user._id,
          updatedAt: new Date()
        });
        await application.save();
      }
    }

    return offer;
  }

  async getOffers(filters) {
    const query = {};

    if (filters.candidateId) query.candidate = filters.candidateId;
    if (filters.applicationId) query.application = filters.applicationId;

    if (filters.companyId) {
      const Job = require('../jobs/job.model');
      const jobs = await Job.find({ company: filters.companyId }).select('_id');
      const jobIds = jobs.map(j => j._id);

      const applications = await Application.find({ job: { $in: jobIds } }).select('_id');
      const appIds = applications.map(a => a._id);

      query.application = { $in: appIds };
    }

    return await Offer.find(query)
      .populate({
        path: 'application',
        populate: { path: 'job', populate: { path: 'company' } }
      })
      .populate('candidate', 'name email')
      .sort({ createdAt: -1 });
  }

  async getOfferById(offerId, user) {
    const offer = await populateOffer(offerId);
    assertOfferAccess(offer, user);
    return offer;
  }
}

module.exports = new OfferService();
