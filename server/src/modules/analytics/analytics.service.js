const User = require('../auth/user.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const Interview = require('../interviews/interview.model');
const Offer = require('../offers/offer.model');
const Company = require('../companies/company.model');

class AnalyticsService {
  async getAdminAnalytics() {
    const totalUsers = await User.countDocuments();
    const totalCandidates = await User.countDocuments({ role: 'CANDIDATE' });
    const totalRecruiters = await User.countDocuments({ role: 'RECRUITER' });
    const totalEmployers = await User.countDocuments({ role: 'EMPLOYER' });

    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'Published' });
    const totalApplications = await Application.countDocuments();

    // Mock revenue history
    const revenueAnalytics = [
      { month: 'Jan', revenue: 4500 },
      { month: 'Feb', revenue: 5800 },
      { month: 'Mar', revenue: 6200 },
      { month: 'Apr', revenue: 8500 },
      { month: 'May', revenue: 9400 },
      { month: 'Jun', revenue: 12000 }
    ];

    // Mock User growth
    const userGrowth = [
      { month: 'Jan', users: 120 },
      { month: 'Feb', users: 240 },
      { month: 'Mar', users: 380 },
      { month: 'Apr', users: 510 },
      { month: 'May', users: 780 },
      { month: 'Jun', users: 950 }
    ];

    return {
      stats: {
        totalUsers,
        totalCandidates,
        totalRecruiters,
        totalEmployers,
        totalJobs,
        activeJobs,
        totalApplications
      },
      revenueAnalytics,
      userGrowth
    };
  }

  async getEmployerAnalytics(userId) {
    const company = await Company.findOne({ owner: userId });
    if (!company) {
      return { stats: { totalJobs: 0, totalApplications: 0, hires: 0 }, funnel: [] };
    }

    const totalJobs = await Job.countDocuments({ company: company._id });
    const publisherJobs = await Job.find({ company: company._id }).select('_id');
    const jobIds = publisherJobs.map(j => j._id);

    const totalApplications = await Application.countDocuments({ job: { $in: jobIds } });
    const hires = await Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Hired' });

    // Calculate hiring funnel
    const applied = await Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Applied' });
    const screening = await Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Screening' });
    const shortlisted = await Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Shortlisted' });
    const interviewed = await Application.countDocuments({ job: { $in: jobIds }, currentStage: { $regex: /Interview/i } });
    const selected = await Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Selected' });

    const funnel = [
      { stage: 'Applied', count: applied },
      { stage: 'Screening', count: screening },
      { stage: 'Shortlisted', count: shortlisted },
      { stage: 'Interview', count: interviewed },
      { stage: 'Selected', count: selected },
      { stage: 'Hired', count: hires }
    ];

    return {
      stats: {
        totalJobs,
        totalApplications,
        hires
      },
      funnel
    };
  }

  async getRecruiterAnalytics(userId) {
    // Assigned jobs
    const recruiterJobs = await Job.find({ assignedRecruiter: userId }).select('_id');
    const jobIds = recruiterJobs.map(j => j._id);

    const totalAssignedJobs = recruiterJobs.length;
    const activeInterviews = await Interview.countDocuments({ interviewer: userId, status: 'Scheduled' });
    const candidatesScreened = await Application.countDocuments({ job: { $in: jobIds }, currentStage: { $ne: 'Applied' } });
    const hiresMade = await Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Hired' });

    return {
      stats: {
        totalAssignedJobs,
        activeInterviews,
        candidatesScreened,
        hiresMade
      }
    };
  }

  async getCandidateAnalytics(userId) {
    const totalApplications = await Application.countDocuments({ candidate: userId });
    const activeInterviews = await Interview.countDocuments({ candidate: userId, status: 'Scheduled' });
    const offersReceived = await Offer.countDocuments({ candidate: userId });

    const successRate = totalApplications > 0 
      ? Math.round((offersReceived / totalApplications) * 100) 
      : 0;

    return {
      stats: {
        totalApplications,
        activeInterviews,
        offersReceived,
        successRate
      }
    };
  }
}

module.exports = new AnalyticsService();
