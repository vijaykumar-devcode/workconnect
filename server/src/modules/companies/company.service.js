const Company = require('./company.model');
const User = require('../auth/user.model');
const { AppError } = require('../../middleware/errorHandler');
const emailService = require('../../services/emailService');



class CompanyService {
  async registerCompany(companyData, userId) {
    // Check if user already owns a company
    const existingCompany = await Company.findOne({ owner: userId });
    if (existingCompany) {
      throw new AppError('You have already registered a company', 400);
    }

    const company = await Company.create({
      ...companyData,
      owner: userId,
      isVerified: false // Requires Admin Verification
    });

    // Update user's company reference
    await User.findByIdAndUpdate(userId, { company: company._id });

    return company;
  }

  async getCompanyByOwner(userId) {
    return await Company.findOne({ owner: userId }).populate('recruiters', '-password');
  }

  async getCompanyById(id, user) {
    const company = await Company.findById(id).populate('recruiters', '-password');
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const userId = user?._id?.toString?.();
    const ownerId = company.owner?.toString?.();
    const userCompanyId = user?.company?.toString?.();

    const isAuthorizedFullAccess = user?.role === 'ADMIN' || ownerId === userId || userCompanyId === company._id.toString();

    if (isAuthorizedFullAccess) {
      return company;
    }

    // Public DTO for candidates or unassociated users
    return {
      _id: company._id,
      name: company.name,
      logo: company.logo,
      description: company.description,
      industry: company.industry,
      website: company.website,
      location: company.location,
      benefits: company.benefits,
      gallery: company.gallery,
      isVerified: company.isVerified,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt
    };
  }

  async updateCompany(userId, updateData) {
    const company = await Company.findOne({ owner: userId });
    if (!company) {
      throw new AppError('Company profile not found', 404);
    }

    // Keep owner same
    delete updateData.owner;
    delete updateData.isVerified;

    Object.assign(company, updateData);
    await company.save();

    return company;
  }

  async addRecruiter(userId, recruiterData) {
    const company = await Company.findOne({ owner: userId });
    if (!company) {
      throw new AppError('Company profile not found. Register your company first.', 404);
    }

    const { name, email, password } = recruiterData;

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Create Recruiter User
    const recruiter = await User.create({
      name,
      email,
      password,
      role: 'RECRUITER',
      company: company._id,
      status: 'ACTIVE',
      isEmailVerified: false,
      otp,
      otpExpires
    });

    // Add reference to company
    company.recruiters.push(recruiter._id);
    await company.save();

    // Trigger emails
    emailService.recruiterInvitationEmail(recruiter, company.name, password);
    emailService.otpEmail(recruiter, otp);

    recruiter.password = undefined;
    recruiter.otp = undefined;
    recruiter.otpExpires = undefined;
    return recruiter;
  }

  async removeRecruiter(userId, recruiterId) {
    const company = await Company.findOne({ owner: userId });
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Delete or suspend user
    await User.findByIdAndDelete(recruiterId);

    // Remove from company recruiters list
    company.recruiters = company.recruiters.filter(r => r.toString() !== recruiterId);
    await company.save();

    return true;
  }

  // Admin Actions
  async getAllCompanies() {
    return await Company.find().populate('owner', 'name email');
  }

  async verifyCompany(companyId, isVerified) {
    const company = await Company.findById(companyId).populate('owner');
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    company.isVerified = isVerified;
    await company.save();

    // Trigger company approval/rejection email
    if (company.owner) {
      emailService.approvalEmail(company.owner, company.name, isVerified);
    }

    return company;
  }
}

module.exports = new CompanyService();

