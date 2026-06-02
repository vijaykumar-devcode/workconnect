const offerService = require('./offer.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const createOffer = asyncHandler(async (req, res, next) => {
  const offer = await offerService.createOffer(req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Offer created successfully',
    data: { offer }
  });
});

const getOffers = asyncHandler(async (req, res, next) => {
  const filters = {};

  if (req.user.role === 'CANDIDATE') {
    filters.candidateId = req.user._id;
  } else if (req.user.role === 'EMPLOYER' || req.user.role === 'RECRUITER') {
    if (!req.user.company) {
      throw new Error('You are not authorized to access this offer list');
    }
    filters.companyId = req.user.company;
  }

  const offers = await offerService.getOffers(filters);
  res.status(200).json({
    success: true,
    message: 'Offers list retrieved successfully',
    data: { offers }
  });
});

const getOfferById = asyncHandler(async (req, res, next) => {
  const offer = await offerService.getOfferById(req.params.offerId, req.user);
  res.status(200).json({
    success: true,
    message: 'Offer retrieved successfully',
    data: { offer }
  });
});

const updateOfferStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const offer = await offerService.updateOfferStatus(req.params.offerId, status, req.user);
  res.status(200).json({
    success: true,
    message: `Offer status successfully updated to: ${status}`,
    data: { offer }
  });
});

module.exports = {
  createOffer,
  getOffers,
  getOfferById,
  updateOfferStatus,
};
