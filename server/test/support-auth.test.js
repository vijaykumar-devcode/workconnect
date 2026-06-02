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
const supportTicketModelPath = path.join(__dirname, '..', 'src', 'modules', 'support', 'supportTicket.model.js');

const tickets = [];
let ticketSequence = 1;

const buildQuery = (items) => ({
  populate: () => ({
    sort: async () => items,
  }),
  sort: async () => items,
});

mockRequire(userModelPath, {
  findById: async (id) => {
    const users = {
      'owner-1': { _id: 'owner-1', status: 'ACTIVE', role: 'CANDIDATE', name: 'Owner User', email: 'owner@example.com' },
      'recruiter-1': { _id: 'recruiter-1', status: 'ACTIVE', role: 'RECRUITER', name: 'Recruiter User', email: 'recruiter@example.com' },
      'admin-1': { _id: 'admin-1', status: 'ACTIVE', role: 'ADMIN', name: 'Admin User', email: 'admin@example.com' },
    };

    return users[id] || null;
  },
});

mockRequire(supportTicketModelPath, {
  create: async ({ user, subject, message }) => {
    const ticket = {
      _id: `ticket-${ticketSequence++}`,
      user,
      subject,
      message,
      status: 'Open',
      responses: [],
      createdAt: new Date(),
      save: async function save() {
        return this;
      },
    };

    tickets.push(ticket);
    return ticket;
  },
  find: (query = {}) => {
    const items = query.user ? tickets.filter((ticket) => ticket.user === query.user) : tickets;
    return buildQuery(items);
  },
  findById: async (ticketId) => tickets.find((ticket) => ticket._id === ticketId) || null,
  findByIdAndUpdate: async (ticketId, update) => {
    const ticket = tickets.find((item) => item._id === ticketId);
    if (!ticket) return null;
    Object.assign(ticket, update);
    return ticket;
  },
});

const { errorHandler } = require('../src/middleware/errorHandler');
const supportRoutes = require('../src/modules/support/support.routes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/support', supportRoutes);
  app.use(errorHandler);
  return app;
};

const ownerToken = jwt.sign({ id: 'owner-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const recruiterToken = jwt.sign({ id: 'recruiter-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const adminToken = jwt.sign({ id: 'admin-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('denies non-admin users from responding to support tickets', async () => {
  tickets.length = 0;
  tickets.push({
    _id: 'ticket-1',
    user: 'owner-1',
    subject: 'Login issue',
    message: 'Need help',
    status: 'Open',
    responses: [],
    save: async function save() { return this; },
  });

  const app = buildApp();
  const response = await supertest(app)
    .post('/api/support/ticket-1/respond')
    .set('Authorization', `Bearer ${recruiterToken}`)
    .send({ message: 'Working on it' });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /permission/i);
});

test('allows ticket owners to create and view their own tickets', async () => {
  tickets.length = 0;
  const app = buildApp();

  const createResponse = await supertest(app)
    .post('/api/support')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ subject: 'Billing question', message: 'Please check my invoice' });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.data.ticket.user, 'owner-1');

  const listResponse = await supertest(app)
    .get('/api/support/my')
    .set('Authorization', `Bearer ${ownerToken}`);

  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.data.tickets.length, 1);
  assert.equal(listResponse.body.data.tickets[0].subject, 'Billing question');
});

test('allows admin users to respond to support tickets', async () => {
  tickets.length = 0;
  tickets.push({
    _id: 'ticket-1',
    user: 'owner-1',
    subject: 'Login issue',
    message: 'Need help',
    status: 'Open',
    responses: [],
    save: async function save() { return this; },
  });

  const app = buildApp();
  const response = await supertest(app)
    .post('/api/support/ticket-1/respond')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ message: 'Support has replied' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.ticket.responses.length, 1);
  assert.equal(response.body.data.ticket.responses[0].message, 'Support has replied');
});
