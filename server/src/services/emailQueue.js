const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { shouldUseRedis } = require('./redisClient');

const redisUrl = process.env.REDIS_URI || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let emailQueue = null;
let emailWorker = null;
let dispatchMail = null;

const initEmailQueue = (dispatcher) => {
  if (!shouldUseRedis()) {
    logger.info('✉️ Email Queue Initialization Skipped (Redis Disabled)');
    dispatchMail = dispatcher;
    return;
  }
  
  dispatchMail = dispatcher;

  // BullMQ requires maxRetriesPerRequest: null
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  emailQueue = new Queue('email-queue', { connection });

  emailWorker = new Worker('email-queue', async job => {
    if (dispatchMail) {
      await dispatchMail(job.data);
    }
  }, { connection, concurrency: 5 });

  emailWorker.on('completed', job => {
    logger.info(`✉️ Email job ${job.id} successfully completed`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`💥 Email job ${job.id || 'unknown'} failed: ${err.message}`);
  });
  
  logger.info('✉️ Email Queue Initialized');
};

const addEmailJob = async (data) => {
  if (emailQueue) {
    await emailQueue.add('send-email', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  } else if (dispatchMail) {
    // Fallback if Redis is disabled
    try {
      await dispatchMail(data);
    } catch (err) {
      logger.error('💥 EMAIL DISPATCH FAILURE (Fallback mode):', err.message);
    }
  }
};

const getEmailQueue = () => emailQueue;
const getEmailWorker = () => emailWorker;

module.exports = { initEmailQueue, addEmailJob, getEmailQueue, getEmailWorker };
