const express = require('express');
const router = express.Router();
const applicationController = require('./application.controller');
const { validateApply } = require('./application.validation');
const { protect, authorize } = require('../../middleware/authMiddleware');

// Candidate applying
router.post('/apply/:jobId', protect, authorize('CANDIDATE'), validateApply, applicationController.applyToJob);

// Get Applications List (Adaptive per role)
router.get('/', protect, applicationController.getApplications);

// Details
router.get('/:applicationId', protect, applicationController.getApplicationDetails);

// Employer/Recruiter management of pipeline stage, comments and assessment scoring
router.put('/:applicationId/stage', protect, authorize('EMPLOYER', 'RECRUITER'), applicationController.updateStage);
router.put('/:applicationId/assessment', protect, authorize('EMPLOYER', 'RECRUITER'), applicationController.updateAssessment);
router.post('/:applicationId/comments', protect, authorize('EMPLOYER', 'RECRUITER'), applicationController.addComment);

// Onboarding module uploads
router.post('/:applicationId/onboarding', protect, authorize('CANDIDATE'), applicationController.uploadOnboardingDoc);
router.put('/:applicationId/onboarding/:docId/verify', protect, authorize('EMPLOYER', 'RECRUITER'), applicationController.verifyOnboardingDoc);

module.exports = router;
