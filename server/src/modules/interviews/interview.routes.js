const express = require('express');
const router = express.Router();
const interviewController = require('./interview.controller');
const { protect, authorize } = require('../../middleware/authMiddleware');

router.post('/', protect, authorize('EMPLOYER', 'RECRUITER'), interviewController.scheduleInterview);
router.get('/', protect, interviewController.getInterviews);
router.put('/:interviewId', protect, authorize('EMPLOYER', 'RECRUITER'), interviewController.updateInterview);
router.put('/:interviewId/feedback', protect, authorize('EMPLOYER', 'RECRUITER'), interviewController.submitFeedback);
router.post('/:interviewId/token', protect, interviewController.generateLiveKitToken);

module.exports = router;
