const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');
const mongoose = require('mongoose');

const interviewModelPath = path.join(__dirname, '..', 'src', 'modules', 'interviews', 'interview.model.js');
const applicationModelPath = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.model.js');
const emailServicePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');

let emailsSent = [];

mockRequire(emailServicePath, {
  interviewEmail: async (user) => {
    emailsSent.push({ type: 'interview', email: user.email });
  }
});

mockRequire('livekit-server-sdk', {
  AccessToken: class {
    constructor(apiKey, apiSecret, options) {
      this.options = options;
      this.grants = {};
    }
    addGrant(grant) {
      this.grants = grant;
    }
    toJwt() {
      return `mock-jwt-${this.options.identity}-${this.options.ttl}`;
    }
  }
});

let mockInterviews = {};
let mockApplications = {
  'app-1': {
    _id: 'app-1',
    candidate: { _id: 'cand-1', email: 'cand@test.com' },
    job: { _id: 'job-1', company: 'comp-1', title: 'Software Engineer' },
    stageHistory: [],
    save: async function() { return this; }
  }
};

mockRequire(applicationModelPath, {
  findById: (id) => {
    const app = mockApplications[id];
    const mockQuery = {
      populate: () => {
        return {
          populate: () => Promise.resolve(app)
        }
      }
    };
    return mockQuery;
  }
});

mockRequire(interviewModelPath, {
  findById: async (id) => mockInterviews[id],
  create: async (data) => {
    if (new Date(data.date) <= new Date()) {
      const err = new Error('Interview date must be in the future');
      err.name = 'ValidationError';
      throw err;
    }
    const interview = {
      _id: `int_${Date.now()}`,
      ...data,
      save: async function() { return this; }
    };
    mockInterviews[interview._id] = interview;
    return interview;
  }
});

process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret';

const interviewService = require('../src/modules/interviews/interview.service');

test('rejects scheduling an interview in the past', async () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday

  await assert.rejects(
    () => interviewService.scheduleInterview({
      applicationId: 'app-1',
      interviewerId: 'recruiter-1',
      date: pastDate,
      duration: 45
    }, { _id: 'recruiter-1', role: 'RECRUITER', company: 'comp-1' }),
    (error) => error.name === 'ValidationError' && /in the future/.test(error.message)
  );
});

test('schedules an interview and generates a LiveKit token', async () => {
  emailsSent = [];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  const interview = await interviewService.scheduleInterview({
    applicationId: 'app-1',
    interviewerId: 'recruiter-1',
    date: futureDate,
    duration: 45,
    roomType: 'INTERNAL_ROOM'
  }, { _id: 'recruiter-1', role: 'RECRUITER', company: 'comp-1' });

  assert.ok(interview._id);
  assert.equal(interview.roomType, 'INTERNAL_ROOM');
  assert.ok(interview.roomMetadata.livekitRoomName);
  assert.equal(emailsSent.length, 1);
  
  // Verify Candidate gets a token
  const token = await interviewService.generateLiveKitToken(interview._id, {
    _id: 'cand-1',
    role: 'CANDIDATE',
    name: 'Test Candidate'
  });
  
  assert.equal(token, 'mock-jwt-cand-1-10m');
});

test('rejects unauthorized access to LiveKit room', async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  const interview = await interviewService.scheduleInterview({
    applicationId: 'app-1',
    interviewerId: 'recruiter-1',
    date: futureDate,
    duration: 45,
    roomType: 'INTERNAL_ROOM'
  }, { _id: 'recruiter-1', role: 'RECRUITER', company: 'comp-1' });

  // Wrong candidate
  await assert.rejects(
    () => interviewService.generateLiveKitToken(interview._id, {
      _id: 'cand-2',
      role: 'CANDIDATE',
      name: 'Hacker'
    }),
    (error) => error.statusCode === 403 && /Unauthorized access/.test(error.message)
  );

  // Wrong recruiter
  await assert.rejects(
    () => interviewService.generateLiveKitToken(interview._id, {
      _id: 'recruiter-2',
      role: 'RECRUITER',
      name: 'Bad Recruiter'
    }),
    (error) => error.statusCode === 403 && /Unauthorized access/.test(error.message)
  );
});
