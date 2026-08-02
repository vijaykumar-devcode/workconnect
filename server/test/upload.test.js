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
const uploadServicePath = path.join(__dirname, '..', 'src', 'services', 'uploadService.js');

mockRequire(userModelPath, {
  findById: (id) => {
    const user = id === 'user-1' ? {
      _id: 'user-1',
      status: 'ACTIVE',
      role: 'CANDIDATE',
      name: 'Test Candidate',
      email: 'candidate@example.com',
    } : null;
    const query = Promise.resolve(user);
    query.lean = () => Promise.resolve(user);
    return query;
  },
});

mockRequire(uploadServicePath, {
  handleUpload: async () => ({ fileUrl: '/uploads/resumes/test.pdf' }),
});

const { errorHandler } = require('../src/middleware/errorHandler');
const uploadRoutes = require('../src/modules/upload/upload.routes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/upload', uploadRoutes);
  app.use(errorHandler);
  return app;
};

const authToken = jwt.sign({ id: 'user-1' }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('rejects unauthenticated uploads with 401', async () => {
  const app = buildApp();

  const response = await supertest(app)
    .post('/api/upload')
    .field('category', 'resume')
    .attach('file', Buffer.from('%PDF-1.4\n% test pdf'), {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('accepts authenticated valid uploads', async () => {
  const app = buildApp();

  const response = await supertest(app)
    .post('/api/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('category', 'resume')
    .attach('file', Buffer.from('%PDF-1.4\n% test pdf'), {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, '');
  assert.equal(response.body.data.fileUrl, '/uploads/resumes/test.pdf');
});

test('rejects missing category with 400', async () => {
  const app = buildApp();

  const response = await supertest(app)
    .post('/api/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .attach('file', Buffer.from('%PDF-1.4\n% test pdf'), {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /category is required/i);
});

test('rejects invalid MIME for avatar uploads with 400', async () => {
  const app = buildApp();

  const response = await supertest(app)
    .post('/api/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('category', 'avatar')
    .attach('file', Buffer.from('%PDF-1.4\n% test pdf'), {
      filename: 'avatar.pdf',
      contentType: 'application/pdf',
    });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /invalid file format/i);
});
