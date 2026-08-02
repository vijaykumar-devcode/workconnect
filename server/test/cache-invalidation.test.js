const mongoose = require('mongoose');
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
const jwt = require('jsonwebtoken');
const { test, describe, before, after, it } = require('node:test');
const assert = require('node:assert');
const User = require('../src/modules/auth/user.model');
const authService = require('../src/modules/auth/auth.service');
const { getRedisClient } = require('../src/services/redisClient');
const authMiddleware = require('../src/middleware/authMiddleware');

const TEST_DB = process.env.MONGODB_URI || 'mongodb://localhost:27017/workconnect_test';

describe('Cache Invalidation Integration Tests', () => {
  let redisClient;
  let testUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB);
    }
    await User.deleteMany({});
    
    redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.flushall();
    }
    
    testUser = await User.create({
      name: 'Cache Test User',
      email: 'cachetest@example.com',
      password: 'password123',
      role: 'CANDIDATE',
    });
  });

  after(async () => {
    await User.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (redisClient) {
      await redisClient.quit();
    }
  });

  it('should invalidate cache when profile is updated', async () => {
    // 1. Manually set a mock cache entry for this user
    const cacheKey = `workconnect:user:${testUser._id}`;
    if (redisClient) {
      const mockCachedUser = { ...testUser.toObject(), name: 'Old Cached Name' };
      await redisClient.set(cacheKey, JSON.stringify(mockCachedUser), 'EX', 300);
      
      const cachedBefore = await redisClient.get(cacheKey);
      assert.ok(cachedBefore, 'Cache entry should exist before update');
    }

    // 2. Call the updateProfile service
    await authService.updateProfile(testUser._id, { name: 'New Updated Name' });

    // 3. Verify cache is cleared
    if (redisClient) {
      const cachedAfter = await redisClient.get(cacheKey);
      assert.strictEqual(cachedAfter, null, 'Cache entry should be deleted after update');
    }

    // 4. Verify MongoDB is updated
    const dbUser = await User.findById(testUser._id);
    assert.strictEqual(dbUser.name, 'New Updated Name', 'Database should have new name');
  });

  it('should invalidate cache when user status is updated', async () => {
    const cacheKey = `workconnect:user:${testUser._id}`;
    if (redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(testUser), 'EX', 300);
    }

    await authService.updateUserStatus(testUser._id, 'SUSPENDED');

    if (redisClient) {
      const cachedAfter = await redisClient.get(cacheKey);
      assert.strictEqual(cachedAfter, null, 'Cache should be deleted when status changes');
    }
  });
});
