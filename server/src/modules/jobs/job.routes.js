const express = require('express');
const router = express.Router();
const jobController = require('./job.controller');
const { validateJobPost } = require('./job.validation');
const { protect, authorize } = require('../../middleware/authMiddleware');

// Admin Only
router.get('/admin/all', protect, authorize('ADMIN'), jobController.getAllJobsForAdmin);
router.put('/:jobId/moderate', protect, authorize('ADMIN'), jobController.moderateJob);

// Public Index & Detail
router.get('/', jobController.getJobs);
router.get('/:jobId', jobController.getJobDetails);

// Protected (Employers Only)
router.post('/', protect, authorize('EMPLOYER'), validateJobPost, jobController.createJob);
router.put('/:jobId', protect, authorize('EMPLOYER'), jobController.updateJob);
router.delete('/:jobId', protect, authorize('EMPLOYER'), jobController.deleteJob);
router.post('/:jobId/duplicate', protect, authorize('EMPLOYER'), jobController.duplicateJob);
router.put('/:jobId/assign', protect, authorize('EMPLOYER'), jobController.assignRecruiter);

module.exports = router;
