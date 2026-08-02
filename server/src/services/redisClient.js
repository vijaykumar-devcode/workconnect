const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const shouldUseRedis = () => {
  if (process.env.USE_REDIS === 'false') return false;
  return process.env.USE_REDIS === 'true' || Boolean(process.env.REDIS_URI || process.env.REDIS_URL);
};

const getRedisClient = () => {
  if (!shouldUseRedis()) {
    return null;
  }
  if (redisClient) {
    return redisClient;
  }
  const redisUrl = process.env.REDIS_URI || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  redisClient.on('error', (err) => logger.warn(`Redis client error: ${err.message}`));
  return redisClient;
};

const closeRedisClient = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = {
  getRedisClient,
  closeRedisClient,
  shouldUseRedis
};
