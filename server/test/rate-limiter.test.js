const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const mockRequire = require('mock-require');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Mock DB/Redis for test isolation before requiring app modules
mockRequire('../src/modules/auth/user.model.js', {
  findOne: () => {
    const query = Promise.resolve({
      _id: '60d0fe4f5311236168a109ca',
      role: 'ADMIN',
      status: 'ACTIVE',
      email: 'test@example.com',
      password: 'password123',

      comparePassword: async () => true
    });

    query.select = () => query;
    query.lean = () => Promise.resolve({
      _id: '60d0fe4f5311236168a109ca',
      role: 'ADMIN',
      status: 'ACTIVE',
      email: 'test@example.com'
    });

    return query;
  },

  findById: () => {
    const query = Promise.resolve({
      _id: '60d0fe4f5311236168a109ca',
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    query.select = () => query;
    query.lean = () => Promise.resolve({
      _id: '60d0fe4f5311236168a109ca',
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    return query;
  }
});

mockRequire('../src/modules/support/supportTicket.model.js', {
  create: () => Promise.resolve({ _id: 'mock-ticket-1' })
});

mockRequire('../src/services/redisClient.js', {
  shouldUseRedis: () => false,
  getRedisClient: () => null
});

const { registerRoutes } = require('../src/bootstrap/appBootstrap');
const { AUTH_LIMIT, OTP_LIMIT, SUPPORT_LIMIT, GLOBAL_LIMIT } = require('../src/middleware/rateLimiter');

assert.ok(AUTH_LIMIT, 'AUTH_LIMIT must be exported from rateLimiter.js');
assert.ok(OTP_LIMIT, 'OTP_LIMIT must be exported from rateLimiter.js');
assert.ok(SUPPORT_LIMIT, 'SUPPORT_LIMIT must be exported from rateLimiter.js');
assert.ok(GLOBAL_LIMIT, 'GLOBAL_LIMIT must be exported from rateLimiter.js');

const app = express();
app.set('trust proxy', 1);
registerRoutes(app);

const adminToken = jwt.sign({ id: '60d0fe4f5311236168a109ca' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const findLimit = async (endpoint, method, expectedLimit, exactErrorMessage, token = null, payload = {}) => {
  const testIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

  for (let i = 0; i < expectedLimit; i++) {
    const req = supertest(app)[method](endpoint).set('X-Forwarded-For', testIp).send(payload);
    if (token) req.set('Authorization', `Bearer ${token}`);
    const res = await req;

    assert.notEqual(res.status, 429, `Request ${i + 1} should not be rate limited`);
    assert.notEqual(res.status, 500, `Request ${i + 1} caused a server error: ${res.body?.message || res.text}`);
  }

  const req429 = supertest(app)[method](endpoint).set('X-Forwarded-For', testIp).send(payload);
  if (token) req429.set('Authorization', `Bearer ${token}`);
  const rateLimitResponse = await req429;

  assert.equal(rateLimitResponse.status, 429);

  assert.deepEqual(rateLimitResponse.body, {
    success: false,
    message: exactErrorMessage
  });

  assert.equal(rateLimitResponse.headers['ratelimit-remaining'], '0', 'RateLimit-Remaining should be 0');
  assert.equal(rateLimitResponse.headers['ratelimit-limit'], String(expectedLimit), 'RateLimit-Limit should match exported limit');
  assert.ok(rateLimitResponse.headers['retry-after'], 'Should include Retry-After header');

  return rateLimitResponse;
};

test('Rate Limiter Tests', async (t) => {
  await t.test('enforces Auth Limiter on /api/auth/login', async () => {
    await findLimit(
      '/api/auth/login',
      'post',
      AUTH_LIMIT,
      'Too many authentication attempts, please try again after 15 minutes',
      null,
      { email: 'test@example.com', password: 'password123' }
    );
  });

  await t.test('enforces OTP Limiter on /api/auth/verify-otp', async () => {
    await findLimit(
      '/api/auth/verify-otp',
      'post',
      OTP_LIMIT,
      'Too many OTP/reset requests, please try again after 15 minutes',
      null,
      { email: 'test@example.com', otp: '123456' }
    );
  });

  await t.test('enforces Support Limiter on /api/support', async () => {
    await findLimit(
      '/api/support',
      'post',
      SUPPORT_LIMIT,
      'Too many support requests, please try again after an hour',
      adminToken,
      { subject: 'Need help', message: 'I cannot login' }
    );
  });

  await t.test('enforces Global Limiter on standard API routes', async () => {
    // /api/auth/public/:id uses only globalLimiter, no DB dependencies
    await findLimit(
      '/api/auth/public/60d0fe4f5311236168a109ca',
      'get',
      GLOBAL_LIMIT,
      'Too many requests from this IP, please try again after a minute'
    );
  });
});
