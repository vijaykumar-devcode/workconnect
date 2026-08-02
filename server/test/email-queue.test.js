const mockRequire = require('mock-require');

class MockQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.failedJobs = [];
  }
  async add(name, data, opts) {
    const job = { id: Math.random().toString(), name, data, opts };
    this.jobs.push(job);
    // Simulate worker processing
    if (global.mockWorkerCallback) {
      try {
        await global.mockWorkerCallback(job);
        if (global.mockWorkerComplete) global.mockWorkerComplete(job);
      } catch (err) {
        this.failedJobs.push(job);
        if (global.mockWorkerFailed) global.mockWorkerFailed(job, err);
      }
    }
  }
  async drain() { this.jobs = []; }
  async obliterate() { this.jobs = []; }
  async getFailed() { return this.failedJobs; }
}

class MockWorker {
  constructor(name, callback, opts) {
    this.name = name;
    global.mockWorkerCallback = callback;
  }
  on(event, handler) {
    if (event === 'completed') global.mockWorkerComplete = handler;
    if (event === 'failed') global.mockWorkerFailed = handler;
  }
}

mockRequire('bullmq', { Queue: MockQueue, Worker: MockWorker });
mockRequire('ioredis', class MockRedis { constructor() { this.status = 'ready'; } on() {} quit() {} });

process.env.USE_REDIS = 'true';

const { test, describe, before, after, it } = require('node:test');
const assert = require('node:assert');
const emailService = require('../src/services/emailService');
const { getEmailQueue, getEmailWorker } = require('../src/services/emailQueue');

// We use the existing REDIS configuration which is enabled via USE_REDIS=true
// But since the test might not have Redis, we should check if the queue is active.
describe('Email Queue Integration Tests', () => {
  let queue;
  let worker;
  let originalDispatchMail;
  let dispatchCallCount = 0;
  let lastDispatchPayload = null;

  before(async () => {
    queue = require('../src/services/emailQueue').getEmailQueue();
    worker = require('../src/services/emailQueue').getEmailWorker();

    if (!queue || !worker) {
      console.log('Skipping Email Queue Integration Tests (Redis is not enabled)');
      return;
    }

    // Drain existing jobs if any
    await queue.drain();
    await queue.obliterate({ force: true });

    // Mock the actual dispatcher logic inside emailService
    originalDispatchMail = emailService._dispatchMail;
    emailService._dispatchMail = async (data) => {
      dispatchCallCount++;
      lastDispatchPayload = data;
      
      if (data.subject === 'Trigger Error') {
        throw new Error('Simulated dispatch error');
      }
      return true;
    };
    
    require('../src/services/emailQueue').initEmailQueue(emailService._dispatchMail);
    
    queue = require('../src/services/emailQueue').getEmailQueue();
    worker = require('../src/services/emailQueue').getEmailWorker();
  });

  after(async () => {
    if (originalDispatchMail) {
      emailService._dispatchMail = originalDispatchMail;
    }
  });

  it('should successfully add a job to the email queue and process it', async () => {
    if (!queue || !worker) return; // Skip

    dispatchCallCount = 0;
    
    // Call the service method, which now enqueues the job instead of direct dispatch
    await emailService.sendMail({
      to: 'test@example.com',
      subject: 'Welcome Test',
      html: '<p>Test</p>'
    });

    // Wait briefly for the worker to pick up and process the job
    await new Promise(resolve => setTimeout(resolve, 500));

    assert.strictEqual(dispatchCallCount, 1, 'Dispatcher should have been called once by the worker');
    assert.strictEqual(lastDispatchPayload.to, 'test@example.com');
  });

  it('should properly configure retry parameters for failed jobs', async () => {
    if (!queue || !worker) return; // Skip

    dispatchCallCount = 0;
    
    await emailService.sendMail({
      to: 'error@example.com',
      subject: 'Trigger Error',
      html: '<p>Error</p>'
    });

    // Wait for initial attempt to fail
    await new Promise(resolve => setTimeout(resolve, 500));

    // The job should fail
    const failedJobs = await queue.getFailed();
    assert.strictEqual(failedJobs.length, 1, 'Job should be placed in the failed queue');

    const job = failedJobs[0];
    assert.strictEqual(job.opts.attempts, 5, 'Job should be configured for 5 retries');
    assert.strictEqual(job.opts.backoff.type, 'exponential', 'Job should use exponential backoff');
  });
});
