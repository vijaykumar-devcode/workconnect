const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const mockRequire = require('mock-require');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const companyModelPath = path.join(__dirname, '..', 'src', 'modules', 'companies', 'company.model.js');
const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');
const emailServicePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');
const auditServicePath = path.join(__dirname, '..', 'src', 'modules', 'audit', 'audit.service.js');

let users;
let companies;

const resetState = () => {
  users = {
    'owner-1': { _id: 'owner-1', name: 'Owner One', email: 'owner@example.com', role: 'EMPLOYER', status: 'ACTIVE', company: 'company-1' },
    'recruiter-1': { _id: 'recruiter-1', name: 'Recruiter One', email: 'recruiter@example.com', role: 'RECRUITER', status: 'ACTIVE', company: 'company-1' },
    'recruiter-2': { _id: 'recruiter-2', name: 'Recruiter Two', email: 'recruiter2@example.com', role: 'RECRUITER', status: 'ACTIVE', company: 'company-2' },
    'admin-1': { _id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
  };

  const createCompanyDoc = (company) => ({
    ...company,
    recruiters: [...company.recruiters],
    save: async function save() {
      companies[this._id] = this;
      return this;
    },
    populate: function populate() {
      return this;
    },
  });

  companies = {
    'company-1': createCompanyDoc({
      _id: 'company-1',
      name: 'Alpha Corp',
      description: 'Primary company',
      industry: 'Technology',
      location: 'Remote',
      owner: 'owner-1',
      recruiters: ['recruiter-1'],
      isVerified: false,
    }),
    'company-2': createCompanyDoc({
      _id: 'company-2',
      name: 'Beta Ltd',
      description: 'Secondary company',
      industry: 'Finance',
      location: 'Remote',
      owner: 'owner-2',
      recruiters: ['recruiter-2'],
      isVerified: false,
    }),
  };
};

resetState();

mockRequire(companyModelPath, {
  create: async (data) => {
    const company = {
      _id: `company-${Object.keys(companies).length + 1}`,
      ...data,
      recruiters: [],
      save: async function save() {
        companies[this._id] = this;
        return this;
      },
      populate: function populate() {
        return this;
      },
    };

    companies[company._id] = company;
    return company;
  },
  findOne: async (query) => {
    const company = Object.values(companies).find((item) => item.owner === query.owner);
    return company || null;
  },
  findById: (id) => {
    const company = companies[id];
    if (!company) return { populate: () => null };
    return {
      populate: () => company,
    };
  },
  find: () => ({
    populate: () => ({
      sort: async () => Object.values(companies),
    }),
  }),
});

mockRequire(userModelPath, {
  findById: async (id) => users[id] || null,
  findOne: async (query) => Object.values(users).find((user) => user.email === query.email) || null,
  create: async (data) => {
    const recruiter = {
      _id: `recruiter-created-${Object.keys(users).length + 1}`,
      ...data,
      save: async function save() {
        users[this._id] = this;
        return this;
      },
    };
    users[recruiter._id] = recruiter;
    return recruiter;
  },
  findByIdAndUpdate: async (id, update) => {
    if (!users[id]) return null;
    users[id] = { ...users[id], ...update };
    return users[id];
  },
  findByIdAndDelete: async (id) => {
    const existing = users[id] || null;
    delete users[id];
    return existing;
  },
});

mockRequire(emailServicePath, {
  recruiterInvitationEmail: async () => { },
  otpEmail: async () => { },
  approvalEmail: async () => { },
});

mockRequire(auditServicePath, {
  logAction: async () => { },
});

const { errorHandler } = require('../src/middleware/errorHandler');
const companyRoutes = require('../src/modules/companies/company.routes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/companies', companyRoutes);
  app.use(errorHandler);
  return app;
};

const ownerToken = jwt.sign({ id: 'owner-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const recruiterToken = jwt.sign({ id: 'recruiter-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const adminToken = jwt.sign({ id: 'admin-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('denies recruiter access to another company details', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .get('/api/companies/company-2')
    .set('Authorization', `Bearer ${recruiterToken}`);

  assert.equal(response.status, 403);
  assert.match(response.body.message, /authorized to access this company/i);
});

test('allows the company owner to view own company details', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .get('/api/companies/company-1')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.company._id, 'company-1');
});

test('denies recruiter invite attempts', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .post('/api/companies/recruiters')
    .set('Authorization', `Bearer ${recruiterToken}`)
    .send({ name: 'New Recruiter', email: 'new-recruiter@example.com', password: 'Secret123!' });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test('denies recruiter removal attempts', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .delete('/api/companies/recruiters/recruiter-2')
    .set('Authorization', `Bearer ${recruiterToken}`);

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test('allows the owner to invite recruiters', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .post('/api/companies/recruiters')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ name: 'New Recruiter', email: 'new-recruiter@example.com', password: 'Secret123!' });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.recruiter.role, 'RECRUITER');
  assert.equal(companies['company-1'].recruiters.at(-1), response.body.data.recruiter._id);
});

test('allows the owner to remove recruiters', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .delete('/api/companies/recruiters/recruiter-1')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(response.status, 200);
  assert.equal(companies['company-1'].recruiters.includes('recruiter-1'), false);
});

test('allows admin override for company verification', async () => {
  resetState();
  const app = buildApp();

  const response = await supertest(app)
    .put('/api/companies/company-2/verify')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isVerified: true });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.company.isVerified, true);
});
