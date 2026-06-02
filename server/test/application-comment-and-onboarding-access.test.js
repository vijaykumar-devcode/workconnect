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

const makeApplication = ({ publisherId = 'employer-1', assignedRecruiterId = 'recruiter-1' } = {}) => {
  const onboardingDocuments = [
    {
      _id: 'doc-1',
      docType: 'ID Proof',
      fileUrl: '/uploads/doc-1.pdf',
      status: 'Pending',
    },
  ];

  onboardingDocuments.id = (docId) => onboardingDocuments.find((doc) => doc._id === docId);

  return {
    _id: 'application-1',
    job: {
      _id: 'job-1',
      publisher: publisherId,
      assignedRecruiter: assignedRecruiterId,
      company: { _id: 'company-1' },
      title: 'Frontend Developer',
    },
    candidate: { _id: 'candidate-1' },
    internalComments: [],
    onboardingDocuments,
    save: async function save() {
      return this;
    },
  };
};

test('rejects comments from recruiters not assigned to the job', async () => {
  currentApplication = makeApplication();

  await assert.rejects(
    () => applicationService.addComment('application-1', 'Needs follow-up', {
      _id: 'recruiter-2',
      role: 'RECRUITER',
      company: 'company-1',
    }),
    (error) => error.statusCode === 403 && /not authorized/i.test(error.message)
  );
});

test('allows the publishing employer to add a comment', async () => {
  currentApplication = makeApplication();

  const updated = await applicationService.addComment('application-1', 'Candidate looks promising', {
    _id: 'employer-1',
    role: 'EMPLOYER',
    company: 'company-1',
  });

  assert.equal(updated.internalComments.length, 1);
  assert.equal(updated.internalComments[0].comment, 'Candidate looks promising');
  assert.equal(updated.internalComments[0].author, 'employer-1');
});

test('rejects onboarding verification from recruiters not assigned to the job', async () => {
  currentApplication = makeApplication();

  await assert.rejects(
    () => applicationService.verifyOnboardingDoc('application-1', 'doc-1', 'Verified', {
      _id: 'recruiter-2',
      role: 'RECRUITER',
      company: 'company-1',
    }),
    (error) => error.statusCode === 403 && /not authorized/i.test(error.message)
  );
});

test('allows the publishing employer to verify onboarding documents', async () => {
  currentApplication = makeApplication();

  const updated = await applicationService.verifyOnboardingDoc('application-1', 'doc-1', 'Verified', {
    _id: 'employer-1',
    role: 'EMPLOYER',
    company: 'company-1',
  });

  assert.equal(updated.onboardingDocuments.id('doc-1').status, 'Verified');
});
