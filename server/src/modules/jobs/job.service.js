const Job = require('./job.model');
const Company = require('../companies/company.model');
const User = require('../auth/user.model');
const { AppError } = require('../../middleware/errorHandler');

const assertJobPublisherAccess = (job, userId, action) => {
  if (job.publisher.toString() !== userId.toString()) {
    throw new AppError(`You do not have permission to ${action} this job`, 403);
  }
};

const assertRecruiterAssignmentAccess = async (job, recruiterId, userId) => {
  assertJobPublisherAccess(job, userId, 'assign recruiters to');

  const recruiter = await User.findById(recruiterId);
  if (!recruiter || recruiter.role !== 'RECRUITER') {
    throw new AppError('Recruiter not found', 404);
  }

  if (recruiter.company?.toString?.() !== job.company.toString()) {
    throw new AppError('You can only assign recruiters from your company', 403);
  }

  return recruiter;
};

class JobService {
  async createJob(jobData, userId) {
    // Employer must have registered a company
    const company = await Company.findOne({ owner: userId });
    if (!company) {
      throw new AppError('You must register a company profile before posting a job.', 400);
    }
    if (!company.isVerified) {
      // Force status to Draft if company is pending verification
      jobData.status = 'Draft';
    }

    const job = await Job.create({
      ...jobData,
      company: company._id,
      publisher: userId,
      status: jobData.status || 'Draft'
    });

    return job;
  }

  async editJob(jobId, updateData, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    assertJobPublisherAccess(job, userId, 'modify');

    const company = await Company.findOne({ owner: userId });
    if (company && !company.isVerified && updateData.status === 'Published') {
      updateData.status = 'Draft';
    }

    // Assign updates
    Object.assign(job, updateData);
    await job.save();

    return job;
  }

  async deleteJob(jobId, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    assertJobPublisherAccess(job, userId, 'delete');

    await Job.findByIdAndDelete(jobId);
    return true;
  }

  async duplicateJob(jobId, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job to duplicate not found', 404);
    }

    assertJobPublisherAccess(job, userId, 'duplicate');

    const duplicateData = job.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.assignedRecruiter;

    duplicateData.title = `Copy of ${duplicateData.title}`;
    duplicateData.status = 'Draft';
    duplicateData.publisher = userId;

    return await Job.create(duplicateData);
  }

  async getJobById(id) {
    const job = await Job.findById(id)
      .populate('company')
      .populate('assignedRecruiter', 'name email')
      .populate('publisher', 'name email');

    if (!job) {
      throw new AppError('Job not found', 404);
    }
    return job;
  }

  async queryJobs(filters, user) {
    const query = {};

    let requestedStatus = filters.status || 'Published';

    // Security check for draft/paused leakage
    if (requestedStatus !== 'Published') {
      if (!user || user.role === 'CANDIDATE') {
        requestedStatus = 'Published';
      } else if (user.role === 'EMPLOYER') {
        if (!filters.publisher || filters.publisher.toString() !== user._id.toString()) {
          requestedStatus = 'Published';
        }
      } else if (user.role === 'RECRUITER') {
        if (!filters.assignedRecruiter || filters.assignedRecruiter.toString() !== user._id.toString()) {
          requestedStatus = 'Published';
        }
      }
    }

    query.status = requestedStatus;

    // Search query
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Work Mode (Remote, Hybrid, Onsite)
    if (filters.workMode) {
      query.workMode = filters.workMode;
    }

    // Employment Type (Full-Time, Part-Time, Contract)
    if (filters.employmentType) {
      query.employmentType = filters.employmentType;
    }

    // Location
    if (filters.location) {
      query.location = new RegExp(filters.location, 'i');
    }

    // Experience Required
    if (filters.experience) {
      query.experienceRequired = { $lte: Number(filters.experience) };
    }

    // Salary filter
    if (filters.minSalary) {
      query['salaryRange.min'] = { $gte: Number(filters.minSalary) };
    }

    // Skills
    if (filters.skills) {
      const skillsArray = Array.isArray(filters.skills)
        ? filters.skills
        : filters.skills.split(',').map(s => s.trim());
      query.skillsRequired = { $in: skillsArray };
    }

    // Publisher filter (for Employers viewing their jobs)
    if (filters.publisher) {
      query.publisher = filters.publisher;
    }

    // Recruiter filter (for Recruiters viewing their assigned jobs)
    if (filters.assignedRecruiter) {
      query.assignedRecruiter = filters.assignedRecruiter;
    }

    // Pagination
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const jobs = await Job.find(query)
      .populate('company', 'name logo location industry')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments(query);

    return {
      jobs,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  async assignRecruiter(jobId, recruiterId, userId) {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    await assertRecruiterAssignmentAccess(job, recruiterId, userId);

    job.assignedRecruiter = recruiterId;
    await job.save();

    return job;
  }

  // Admin Actions
  async getAllJobsForAdmin() {
    return await Job.find()
      .populate('company', 'name')
      .populate('publisher', 'name email');
  }

  async moderateJob(jobId, status) {
    if (!['Published', 'Closed', 'Paused', 'Moderation'].includes(status)) {
      throw new AppError('Invalid job status', 400);
    }

    const job = await Job.findByIdAndUpdate(
      jobId,
      { status },
      { new: true }
    );

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    return job;
  }
}

module.exports = new JobService();
