const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const mockRequire = require('mock-require');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const offerModelPath = path.join(__dirname, '..', 'src', 'modules', 'offers', 'offer.model.js');
const applicationModelPath = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.model.js');
const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');

let offers;
let applications;
let users;

const resetState = () => {
  users = {
    'employer-1': { _id: 'employer-1', role: 'EMPLOYER', company: 'company-1' },
    'employer-2': { _id: 'employer-2', role: 'EMPLOYER', company: 'company-2' },
    'candidate-1': { _id: 'candidate-1', role: 'CANDIDATE' },
    'candidate-2': { _id: 'candidate-2', role: 'CANDIDATE' },
    'recruiter-1': { _id: 'recruiter-1', role: 'RECRUITER', company: 'company-1' },
    'admin-1': { _id: 'admin-1', role: 'ADMIN' }
  };

  applications = {
    'application-1': { _id: 'application-1', job: { _id: 'job-1', company: 'company-1' }, candidate: 'candidate-1', currentStage: 'Offer Sent', stageHistory: [], save: async function () { applications[this._id] = this; return this; } }
  };

  offers = {
    'offer-1': { _id: 'offer-1', application: 'application-1', candidate: 'candidate-1', status: 'Sent', save: async function () { offers[this._id] = this; return this; } }
  };
};

resetState();

mockRequire(userModelPath, {
  findById: (id) => {
    const user = users[id] || null;
    const query = Promise.resolve(user);
    query.lean = () => Promise.resolve(user);
    return query;
  },
});

mockRequire(applicationModelPath, {
  findById: (id) => {
    const app = applications[id] || null;
    if (!app) return null;
    const wrapper = Object.assign({}, app);
    wrapper.populate = function (field) {
      if (field === 'candidate') {
        this.candidate = { _id: app.candidate };
        return this;
      }
      if (field === 'job') {
        this.job = Object.assign({}, app.job);
        return this;
      }
      return this;
    };
    return wrapper;
  },
});

mockRequire(offerModelPath, {
  create: async (data) => {
    const id = `offer-${Object.keys(offers).length + 1}`;
    const offer = { _id: id, ...data, save: async function () { offers[this._id] = this; return this; } };
    offers[offer._id] = offer;
    return offer;
  },
  findById: (id) => {
    const o = offers[id];
    return {
      populate: function (arg) {
        if (typeof arg === 'object' && arg.path === 'application') {
          const app = applications[o.application];
          const appWrap = Object.assign({}, app, { job: Object.assign({}, app.job), candidate: { _id: app.candidate } });
          return {
            populate: function (field) {
              if (field === 'candidate') {
                return Object.assign({}, o, { candidate: { _id: o.candidate }, application: appWrap });
              }
              return Object.assign({}, o, { application: appWrap });
            }
          };
        }
        return { populate: () => o };
      }
    };
  },
  find: () => ({
    populate: () => ({ sort: async () => Object.values(offers) })
  })
});

const offerRoutes = require('../src/modules/offers/offer.routes');
const { errorHandler } = require('../src/middleware/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/offers', offerRoutes);
  app.use(errorHandler);
  return app;
};

const tokens = {
  employer1: jwt.sign({ id: 'employer-1' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  employer2: jwt.sign({ id: 'employer-2' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  candidate1: jwt.sign({ id: 'candidate-1' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  candidate2: jwt.sign({ id: 'candidate-2' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  recruiter1: jwt.sign({ id: 'recruiter-1' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
  admin: jwt.sign({ id: 'admin-1' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
};

test('rejects unauthorized candidate viewing another candidate offer', async () => {
  resetState();
  const app = buildApp();

  const res = await supertest(app)
    .get('/api/offers/offer-1')
    .set('Authorization', `Bearer ${tokens.candidate2}`);

  assert.equal(res.status, 403);
});

test('rejects unauthorized employer creating an offer for another company', async () => {
  resetState();
  const app = buildApp();

  const res = await supertest(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${tokens.employer2}`)
    .send({ applicationId: 'application-1', salary: 50000, joiningDate: '2030-01-01' });

  assert.equal(res.status, 403);
});

test('allows owner employer to create and admin override', async () => {
  resetState();
  const app = buildApp();

  const res1 = await supertest(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${tokens.employer1}`)
    .send({ applicationId: 'application-1', salary: 50000, joiningDate: '2030-01-01', status: 'Sent' });

  assert.equal(res1.status, 201);
  assert.equal(res1.body.data.offer.candidate, 'candidate-1');

  const res2 = await supertest(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${tokens.admin}`)
    .send({ applicationId: 'application-1', salary: 60000, joiningDate: '2030-01-01', status: 'Sent' });

  assert.equal(res2.status, 201);
});

test('candidate can accept only own offer', async () => {
  resetState();
  const app = buildApp();

  const res = await supertest(app)
    .put('/api/offers/offer-1/status')
    .set('Authorization', `Bearer ${tokens.candidate1}`)
    .send({ status: 'Accepted' });

  assert.equal(res.status, 200);
  assert.equal(offers['offer-1'].status, 'Accepted');
  assert.equal(offers['offer-1'].statusUpdatedBy, 'candidate-1');
  assert.equal(offers['offer-1'].statusSource, 'CANDIDATE');
});

test('employer cannot accept candidate-only actions', async () => {
  resetState();
  const app = buildApp();

  const res = await supertest(app)
    .put('/api/offers/offer-1/status')
    .set('Authorization', `Bearer ${tokens.employer1}`)
    .send({ status: 'Accepted' });

  assert.equal(res.status, 403);
  assert.equal(offers['offer-1'].status, 'Sent');
});

test('recruiter cannot accept candidate-only actions', async () => {
  resetState();
  const app = buildApp();

  const res = await supertest(app)
    .put('/api/offers/offer-1/status')
    .set('Authorization', `Bearer ${tokens.recruiter1}`)
    .send({ status: 'Accepted' });

  assert.equal(res.status, 403);
  assert.equal(offers['offer-1'].status, 'Sent');
});

test('admin may update any offer status', async () => {
  resetState();
  const app = buildApp();

  const res = await supertest(app)
    .put('/api/offers/offer-1/status')
    .set('Authorization', `Bearer ${tokens.admin}`)
    .send({ status: 'Accepted' });

  assert.equal(res.status, 200);
  assert.equal(offers['offer-1'].statusUpdatedBy, 'admin-1');
  assert.equal(offers['offer-1'].statusSource, 'ADMIN');
});
