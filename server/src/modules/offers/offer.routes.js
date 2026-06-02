const express = require('express');
const router = express.Router();
const offerController = require('./offer.controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.post('/', protect, authorize('EMPLOYER', 'RECRUITER', 'ADMIN'), offerController.createOffer);
router.get('/', protect, offerController.getOffers);
router.get('/:offerId', protect, offerController.getOfferById);
router.put('/:offerId/status', protect, offerController.updateOfferStatus);

module.exports = router;
