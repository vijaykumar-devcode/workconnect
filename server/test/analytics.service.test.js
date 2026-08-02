const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');
const jobModelPath = path.join(__dirname, '..', 'src', 'modules', 'jobs', 'job.model.js');
const applicationModelPath = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.model.js');
const interviewModelPath = path.join(__dirname, '..', 'src', 'modules', 'interviews', 'interview.model.js');
const offerModelPath = path.join(__dirname, '..', 'src', 'modules', 'offers', 'offer.model.js');
const companyModelPath = path.join(__dirname, '..', 'src', 'modules', 'companies', 'company.model.js');

mockRequire(userModelPath, {
  countDocuments: async (query) => {
    if (!query) return 100; // totalUsers
    if (query.role === 'CANDIDATE') return 80;
    if (query.role === 'RECRUITER') return 10;
    if (query.role === 'EMPLOYER') return 10;
    return 0;
  },
  aggregate: async () => [
    { _id: { year: 2026, month: 8 }, count: 5 }
  ]
});

mockRequire(jobModelPath, {
  countDocuments: async (query) => {
    if (!query) return 50; // totalJobs
    if (query.status === 'Published') return 30; // activeJobs
    if (query.company) return 15; // totalJobs for company
    return 0;
  },
  find: (query) => {
    const jobs = [{ _id: 'job-1' }, { _id: 'job-2' }];
    return {
      select: () => Promise.resolve(jobs)
    };
  },
  aggregate: async () => [
    { _id: { year: 2026, month: 8 }, count: 2 }
  ]
});

mockRequire(applicationModelPath, {
  countDocuments: async (query) => {
    if (!query) return 200; // totalApplications
    if (query.candidate) return 5;
    
    // Funnel queries
    if (query.job && query.currentStage === 'Hired') return 1;
    if (query.job && query.currentStage === 'Applied') return 10;
    if (query.job && query.currentStage === 'Screening') return 5;
    if (query.job && query.currentStage === 'Shortlisted') return 3;
    if (query.job && query.currentStage && query.currentStage.$regex) return 2; // Interview
    if (query.job && query.currentStage === 'Selected') return 1;
    if (query.job && query.currentStage && query.currentStage.$ne === 'Applied') return 4;
    if (query.job) return 20; // totalApplications for company jobs

    return 0;
  }
});

mockRequire(companyModelPath, {
  findOne: async (query) => {
    if (query.owner === 'emp-1') return { _id: 'comp-1' };
    return null;
  }
});

mockRequire(interviewModelPath, {
  countDocuments: async (query) => {
    if (query.status === 'Scheduled') return 2;
    return 0;
  }
});

mockRequire(offerModelPath, {
  countDocuments: async (query) => {
    if (query.candidate) return 1;
    return 0;
  }
});

const analyticsService = require('../src/modules/analytics/analytics.service');

test('getAdminAnalytics returns correct structure', async () => {
  const result = await analyticsService.getAdminAnalytics();
  
  assert.equal(result.stats.totalUsers, 100);
  assert.equal(result.stats.totalCandidates, 80);
  assert.equal(result.stats.totalJobs, 50);
  assert.equal(result.stats.activeJobs, 30);
  assert.equal(result.stats.totalApplications, 200);
  
  assert.ok(Array.isArray(result.signupTrend));
  assert.ok(Array.isArray(result.jobPostingTrend));
});

test('getEmployerAnalytics returns correct structure', async () => {
  const result = await analyticsService.getEmployerAnalytics('emp-1');
  
  assert.equal(result.stats.totalJobs, 15);
  assert.equal(result.stats.totalApplications, 20);
  assert.equal(result.stats.hires, 1);
  
  assert.equal(result.funnel.length, 6);
  assert.equal(result.funnel.find(f => f.stage === 'Applied').count, 10);
});

test('getRecruiterAnalytics returns correct structure', async () => {
  const result = await analyticsService.getRecruiterAnalytics('rec-1');
  
  assert.equal(result.stats.totalAssignedJobs, 2); // 2 jobs mocked from Job.find
  assert.equal(result.stats.activeInterviews, 2);
  assert.equal(result.stats.candidatesScreened, 4);
  assert.equal(result.stats.hiresMade, 1);
});

test('getCandidateAnalytics returns correct structure', async () => {
  const result = await analyticsService.getCandidateAnalytics('cand-1');
  
  assert.equal(result.stats.totalApplications, 5);
  assert.equal(result.stats.activeInterviews, 2);
  assert.equal(result.stats.offersReceived, 1);
  assert.equal(result.stats.successRate, 20); // (1/5) * 100
});
