const express = require('express');
const router = express.Router();
const companyController = require('./company.controller');
const { validateCompanyProfile } = require('./company.validation');
const { protect, authorize } = require('../../middleware/authMiddleware');

// Protected routes (Employers)
router.post('/', protect, authorize('EMPLOYER'), validateCompanyProfile, companyController.registerCompany);
router.get('/my', protect, authorize('EMPLOYER'), companyController.getMyCompany);
router.put('/my', protect, authorize('EMPLOYER'), companyController.updateMyCompany);
router.post('/recruiters', protect, authorize('EMPLOYER'), companyController.addRecruiter);
router.delete('/recruiters/:recruiterId', protect, authorize('EMPLOYER'), companyController.removeRecruiter);

// Public / General Protected view
router.get('/:companyId', protect, companyController.getCompanyDetails);

// Admin Only
router.get('/', protect, authorize('ADMIN'), companyController.getAllCompanies);
router.put('/:companyId/verify', protect, authorize('ADMIN'), companyController.verifyCompany);

module.exports = router;
