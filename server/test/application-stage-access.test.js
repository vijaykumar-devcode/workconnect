const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

const applicationModelPath = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.model.js');
const jobModelPath = path.join(__dirname, '..', 'src', 'modules', 'jobs', 'job.model.js');
const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');
const emailServicePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');

let currentApplication = null;

const buildApplicationQuery = () => ({
  populate: () => ({
    populate: () => Promise.resolve(currentApplication),
  }),
});

mockRequire(applicationModelPath, {
  findById: () => buildApplicationQuery(),
});

mockRequire(jobModelPath, {});
mockRequire(userModelPath, {});
mockRequire(emailServicePath, {
  rejectionEmail: async () => { },
  onboardingEmail: async () => { },
});

const applicationService = require('../src/modules/applications/application.service');

const makeApplication = ({ publisherId = 'employer-1', assignedRecruiterId = 'recruiter-1' } = {}) => ({
  _id: 'application-1',
  job: {
    _id: 'job-1',
    publisher: publisherId,
    assignedRecruiter: assignedRecruiterId,
    company: { _id: 'company-1' },
    title: 'Frontend Developer',
  },
  candidate: { _id: 'candidate-1' },
  currentStage: 'Applied',
  stageHistory: [],
  save: async function save() {
    return this;
  },
});

test('rejects stage updates from recruiters not assigned to the job', async () => {
  currentApplication = makeApplication();

  await assert.rejects(
    () => applicationService.updateStage('application-1', 'Screening', {
      _id: 'recruiter-2',
      role: 'RECRUITER',
      company: 'company-1',
    }),
    (error) => error.statusCode === 403 && /not authorized/i.test(error.message)
  );
});

test('allows the publishing employer to update stage', async () => {
  currentApplication = makeApplication();

  const updated = await applicationService.updateStage('application-1', 'Screening', {
    _id: 'employer-1',
    role: 'EMPLOYER',
    company: 'company-1',
  });

  assert.equal(updated.currentStage, 'Screening');
  assert.equal(updated.stageHistory.at(-1).stage, 'Screening');
  assert.equal(updated.stageHistory.at(-1).updatedBy, 'employer-1');
});
