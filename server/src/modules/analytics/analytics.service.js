const User = require('../auth/user.model');
const Job = require('../jobs/job.model');
const Application = require('../applications/application.model');
const Interview = require('../interviews/interview.model');
const Offer = require('../offers/offer.model');
const Company = require('../companies/company.model');

const buildMonthlySeries = async (Model, startDate, endDate, valueKey) => {
  const rows = await Model.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthLabels = [];
  const cursor = new Date(startDate);
  while (cursor < endDate) {
    monthLabels.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      label: cursor.toLocaleString('en-US', { month: 'short' }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const series = monthLabels.map(({ year, month, label }) => {
    const match = rows.find((row) => row._id.year === year && row._id.month === month);
    return {
      month: label,
      [valueKey]: match ? match.count : 0,
    };
  });

  return series;
};

class AnalyticsService {
  async getAdminAnalytics() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalCandidates,
      totalRecruiters,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      signupTrend,
      jobPostingTrend
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'CANDIDATE' }),
      User.countDocuments({ role: 'RECRUITER' }),
      User.countDocuments({ role: 'EMPLOYER' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'Published' }),
      Application.countDocuments(),
      buildMonthlySeries(User, startDate, endDate, 'users'),
      buildMonthlySeries(Job, startDate, endDate, 'jobs')
    ]);

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
      signupTrend,
      jobPostingTrend
    };
  }

  async getEmployerAnalytics(userId) {
    const company = await Company.findOne({ owner: userId });
    if (!company) {
      return { stats: { totalJobs: 0, totalApplications: 0, hires: 0 }, funnel: [] };
    }

    const [totalJobs, publisherJobs] = await Promise.all([
      Job.countDocuments({ company: company._id }),
      Job.find({ company: company._id }).select('_id')
    ]);
    const jobIds = publisherJobs.map(j => j._id);

    const [
      totalApplications,
      hires,
      applied,
      screening,
      shortlisted,
      interviewed,
      selected
    ] = await Promise.all([
      Application.countDocuments({ job: { $in: jobIds } }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Hired' }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Applied' }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Screening' }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Shortlisted' }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: { $regex: /Interview/i } }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Selected' })
    ]);

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
    const [
      activeInterviews,
      candidatesScreened,
      hiresMade
    ] = await Promise.all([
      Interview.countDocuments({ interviewer: userId, status: 'Scheduled' }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: { $ne: 'Applied' } }),
      Application.countDocuments({ job: { $in: jobIds }, currentStage: 'Hired' })
    ]);

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
    const [
      totalApplications,
      activeInterviews,
      offersReceived
    ] = await Promise.all([
      Application.countDocuments({ candidate: userId }),
      Interview.countDocuments({ candidate: userId, status: 'Scheduled' }),
      Offer.countDocuments({ candidate: userId })
    ]);

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
