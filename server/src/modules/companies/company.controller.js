const companyService = require('./company.service');
const auditService = require('../audit/audit.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const registerCompany = asyncHandler(async (req, res, next) => {
  const company = await companyService.registerCompany(req.body, req.user._id);
  res.status(201).json({
    success: true,
    message: 'Company registered successfully. Pending Admin verification.',
    data: { company }
  });
});

const getMyCompany = asyncHandler(async (req, res, next) => {
  const company = await companyService.getCompanyByOwner(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Company profile retrieved successfully',
    data: { company }
  });
});

const getCompanyDetails = asyncHandler(async (req, res, next) => {
  const company = await companyService.getCompanyById(req.params.companyId, req.user);
  res.status(200).json({
    success: true,
    message: 'Company details retrieved successfully',
    data: { company }
  });
});

const updateMyCompany = asyncHandler(async (req, res, next) => {
  const company = await companyService.updateCompany(req.user._id, req.body);
  res.status(200).json({
    success: true,
    message: 'Company profile updated successfully',
    data: { company }
  });
});

const addRecruiter = asyncHandler(async (req, res, next) => {
  const recruiter = await companyService.addRecruiter(req.user._id, req.body);
  res.status(201).json({
    success: true,
    message: 'Recruiter added to company recruitment team successfully',
    data: { recruiter }
  });
});

const removeRecruiter = asyncHandler(async (req, res, next) => {
  await companyService.removeRecruiter(req.user._id, req.params.recruiterId);
  res.status(200).json({
    success: true,
    message: 'Recruiter removed from company recruitment team',
    data: null
  });
});

// Admin Controllers
const getAllCompanies = asyncHandler(async (req, res, next) => {
  const companies = await companyService.getAllCompanies();
  res.status(200).json({
    success: true,
    message: 'Companies list retrieved successfully',
    data: { companies }
  });
});

const verifyCompany = asyncHandler(async (req, res, next) => {
  const { companyId } = req.params;
  const { isVerified } = req.body;
  const company = await companyService.verifyCompany(companyId, isVerified);

  // Non-blocking audit log
  auditService.logAction({
    adminId: req.user._id,
    adminName: req.user.name,
    action: isVerified ? 'COMPANY_APPROVED' : 'COMPANY_REJECTED',
    entityType: 'COMPANY',
    entityId: company._id,
    details: `Admin ${isVerified ? 'approved' : 'rejected'} company ${company.name}`,
    metadata: { companyName: company.name, ownerId: company.owner }
  });

  res.status(200).json({
    success: true,
    message: `Company verification changed to: ${isVerified ? 'VERIFIED' : 'REJECTED'}`,
    data: { company }
  });
});

module.exports = {
  registerCompany,
  getMyCompany,
  getCompanyDetails,
  updateMyCompany,
  addRecruiter,
  removeRecruiter,
  getAllCompanies,
  verifyCompany,
};
