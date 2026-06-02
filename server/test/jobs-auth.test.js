const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const mockRequire = require('mock-require');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');
const companyModelPath = path.join(__dirname, '..', 'src', 'modules', 'companies', 'company.model.js');
const jobModelPath = path.join(__dirname, '..', 'src', 'modules', 'jobs', 'job.model.js');
const auditServicePath = path.join(__dirname, '..', 'src', 'modules', 'audit', 'audit.service.js');

let users;
let companies;
let jobs;
let jobSequence;

const resetState = () => {
  users = {
    'employer-1': { _id: 'employer-1', name: 'Employer One', email: 'employer1@example.com', role: 'EMPLOYER', status: 'ACTIVE', company: 'company-1' },
    'employer-2': { _id: 'employer-2', name: 'Employer Two', email: 'employer2@example.com', role: 'EMPLOYER', status: 'ACTIVE', company: 'company-2' },
    'recruiter-1': { _id: 'recruiter-1', name: 'Recruiter One', email: 'recruiter1@example.com', role: 'RECRUITER', status: 'ACTIVE', company: 'company-1' },
    'recruiter-2': { _id: 'recruiter-2', name: 'Recruiter Two', email: 'recruiter2@example.com', role: 'RECRUITER', status: 'ACTIVE', company: 'company-2' },
    'admin-1': { _id: 'admin-1', name: 'Admin One', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
  };

  companies = {
    'company-1': { _id: 'company-1', owner: 'employer-1', isVerified: true },
    'company-2': { _id: 'company-2', owner: 'employer-2', isVerified: true },
  };

  jobs = {
    'job-1': {
      _id: 'job-1',
      title: 'Frontend Developer',
      description: 'Build interfaces',
      skillsRequired: ['React'],
      experienceRequired: 3,
      location: 'Remote',
      applicationDeadline: new Date('2030-01-01T00:00:00.000Z'),
      company: 'company-1',
      publisher: 'employer-1',
      assignedRecruiter: 'recruiter-1',
      status: 'Published',
      toObject() {
        return {
          _id: this._id,
          title: this.title,
          description: this.description,
          skillsRequired: [...this.skillsRequired],
          experienceRequired: this.experienceRequired,
          location: this.location,
          applicationDeadline: this.applicationDeadline,
          company: this.company,
          publisher: this.publisher,
          assignedRecruiter: this.assignedRecruiter,
          status: this.status,
        };
      },
      save: async function save() {
        jobs[this._id] = this;
        return this;
      },
    },
  };

  jobSequence = 2;
};

const createQuery = (items) => ({
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return Promise.resolve(items);
  },
  then(resolve, reject) {
    return Promise.resolve(items).then(resolve, reject);
  },
});

resetState();

mockRequire(userModelPath, {
  findById: async (id) => users[id] || null,
});

mockRequire(companyModelPath, {
  findOne: async (query) => Object.values(companies).find((company) => company.owner === query.owner) || null,
});

mockRequire(jobModelPath, {
  create: async (data) => {
    const job = {
      _id: `job-${jobSequence++}`,
      ...data,
      toObject() {
        return { ...this };
      },
      save: async function save() {
        jobs[this._id] = this;
        return this;
      },
    };

    jobs[job._id] = job;
    return job;
  },
  findById: async (id) => jobs[id] || null,
  findByIdAndDelete: async (id) => {
    const existing = jobs[id] || null;
    delete jobs[id];
    return existing;
  },
  find: () => createQuery(Object.values(jobs)),
  countDocuments: async () => Object.keys(jobs).length,
});

mockRequire(auditServicePath, {
  logAction: async () => { },
});

const { errorHandler } = require('../src/middleware/errorHandler');
const jobRoutes = require('../src/modules/jobs/job.routes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/jobs', jobRoutes);
  app.use(errorHandler);
  return app;
};

const employer1Token = jwt.sign({ id: 'employer-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const employer2Token = jwt.sign({ id: 'employer-2' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const recruiter1Token = jwt.sign({ id: 'recruiter-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const adminToken = jwt.sign({ id: 'admin-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('blocks non-owners from updating or deleting jobs', async () => {
  resetState();
  const app = buildApp();

  const updateResponse = await supertest(app)
    .put('/api/jobs/job-1')
    .set('Authorization', `Bearer ${employer2Token}`)
    .send({ title: 'Hacked title' });

  assert.equal(updateResponse.status, 403);
  assert.match(updateResponse.body.message, /modify this job/i);

  const deleteResponse = await supertest(app)
    .delete('/api/jobs/job-1')
    .set('Authorization', `Bearer ${employer2Token}`);

  assert.equal(deleteResponse.status, 403);
  assert.match(deleteResponse.body.message, /delete this job/i);
});

test('blocks non-owners from duplicating jobs and resets duplicate ownership', async () => {
  resetState();
  const app = buildApp();

  const deniedResponse = await supertest(app)
    .post('/api/jobs/job-1/duplicate')
    .set('Authorization', `Bearer ${employer2Token}`);

  assert.equal(deniedResponse.status, 403);
  assert.match(deniedResponse.body.message, /duplicate this job/i);

  const allowedResponse = await supertest(app)
    .post('/api/jobs/job-1/duplicate')
    .set('Authorization', `Bearer ${employer1Token}`);

  assert.equal(allowedResponse.status, 201);
  assert.equal(allowedResponse.body.data.job.publisher, 'employer-1');
  assert.equal(allowedResponse.body.data.job.status, 'Draft');
  assert.equal(allowedResponse.body.data.job.assignedRecruiter, undefined);
  assert.match(allowedResponse.body.data.job.title, /^Copy of /);
});

test('only allows assigning recruiters from the same company', async () => {
  resetState();
  const app = buildApp();

  const deniedResponse = await supertest(app)
    .put('/api/jobs/job-1/assign')
    .set('Authorization', `Bearer ${employer1Token}`)
    .send({ recruiterId: 'recruiter-2' });

  assert.equal(deniedResponse.status, 403);
  assert.match(deniedResponse.body.message, /from your company/i);

  const allowedResponse = await supertest(app)
    .put('/api/jobs/job-1/assign')
    .set('Authorization', `Bearer ${employer1Token}`)
    .send({ recruiterId: 'recruiter-1' });

  assert.equal(allowedResponse.status, 200);
  assert.equal(allowedResponse.body.data.job.assignedRecruiter, 'recruiter-1');
});

test('serves the admin jobs route without being shadowed by job id params', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .get('/api/jobs/admin/all')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.jobs.length, 1);
  assert.equal(response.body.data.jobs[0]._id, 'job-1');
});
