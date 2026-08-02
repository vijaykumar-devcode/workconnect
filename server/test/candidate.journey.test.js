const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

const applicationModelPath = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.model.js');
const jobModelPath = path.join(__dirname, '..', 'src', 'modules', 'jobs', 'job.model.js');
const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');
const emailServicePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');

let emailsSent = [];

mockRequire(emailServicePath, {
  applicationEmail: async (user) => {
    emailsSent.push({ type: 'application', email: user.email });
  },
  rejectionEmail: async (user) => {
    emailsSent.push({ type: 'rejection', email: user.email });
  }
});

let mockApplications = [];

mockRequire(jobModelPath, {
  findById: async (id) => {
    if (id === 'job-published') return { _id: id, status: 'Published', title: 'Software Engineer' };
    if (id === 'job-draft') return { _id: id, status: 'Draft' };
    return null;
  }
});

mockRequire(userModelPath, {
  findById: async (id) => ({ _id: id, email: 'candidate@test.com' })
});

class MockApplication {
  constructor(data) {
    Object.assign(this, data);
    this._id = `app_${Date.now()}`;
    if (!this.stageHistory) this.stageHistory = [];
  }
  async save() {
    const idx = mockApplications.findIndex(a => a._id === this._id);
    if (idx > -1) {
      mockApplications[idx] = this;
    } else {
      mockApplications.push(this);
    }
    return this;
  }
}

mockRequire(applicationModelPath, {
  findOne: async (query) => {
    return mockApplications.find(a => a.job === query.job && a.candidate === query.candidate);
  },
  findById: (id) => {
    const app = mockApplications.find(a => a._id === id);
    const mockQuery = {
      populate: () => {
        return {
          populate: () => Promise.resolve(app)
        }
      }
    };
    return mockQuery;
  },
  create: async (data) => {
    const app = new MockApplication(data);
    await app.save();
    return app;
  }
});

const applicationService = require('../src/modules/applications/application.service');

test('rejects application if job is not published', async () => {
  await assert.rejects(
    () => applicationService.applyToJob('job-draft', 'cand-1', { resumeUrl: 'url' }),
    (error) => error.statusCode === 400 && /not accepting applications/.test(error.message)
  );
});

test('successful application creates stageHistory and triggers email', async () => {
  emailsSent = [];
  mockApplications = [];

  const app = await applicationService.applyToJob('job-published', 'cand-1', {
    resumeUrl: 'http://resume.pdf',
    coverLetter: 'Hello'
  });

  assert.ok(app._id);
  assert.equal(app.currentStage, 'Applied');
  assert.equal(app.stageHistory.length, 1);
  assert.equal(app.stageHistory[0].stage, 'Applied');
  assert.equal(app.stageHistory[0].updatedBy, 'cand-1');

  assert.equal(emailsSent.length, 1);
  assert.equal(emailsSent[0].type, 'application');
});

test('rejects duplicate application to same job by same candidate', async () => {
  await assert.rejects(
    () => applicationService.applyToJob('job-published', 'cand-1', { resumeUrl: 'url' }),
    (error) => error.statusCode === 400 && /already applied/.test(error.message)
  );
});

test('updates stage and correctly appends to stageHistory', async () => {
  const existingApp = mockApplications[0];

  const updatedApp = await applicationService.updateStage(
    existingApp._id,
    'Shortlisted',
    { _id: 'recruiter-1', role: 'ADMIN' } // using ADMIN to bypass company access checks for this test
  );

  assert.equal(updatedApp.currentStage, 'Shortlisted');
  assert.equal(updatedApp.stageHistory.length, 2);
  assert.equal(updatedApp.stageHistory[1].stage, 'Shortlisted');
  assert.equal(updatedApp.stageHistory[1].updatedBy, 'recruiter-1');
});
