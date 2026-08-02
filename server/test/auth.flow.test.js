const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

const userModelPath = path.join(__dirname, '..', 'src', 'modules', 'auth', 'user.model.js');
const emailServicePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');
const otpStorePath = path.join(__dirname, '..', 'src', 'services', 'otpStore.js');
const redisClientPath = path.join(__dirname, '..', 'src', 'services', 'redisClient.js');
const jwtSecretsPath = path.join(__dirname, '..', 'src', 'utils', 'jwtSecrets.js');

let emailsSent = [];
let mockUsers = {};
let mockRedisOtp = {};

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

mockRequire(jwtSecretsPath, {
  requireJwtSecret: (key) => process.env[key]
});

mockRequire(redisClientPath, {
  getRedisClient: () => ({
    del: async () => {}
  })
});

mockRequire(emailServicePath, {
  welcomeEmail: async (user) => {
    emailsSent.push({ type: 'welcome', email: user.email });
  },
  otpEmail: async (user, otp) => {
    emailsSent.push({ type: 'otp', email: user.email, otp });
  }
});

mockRequire(otpStorePath, {
  generateOtp: () => '123456',
  setOtp: async (email, otp) => {
    mockRedisOtp[email] = otp;
    return true;
  },
  getOtpHash: async (email) => {
    return mockRedisOtp[email] ? `hashed_${mockRedisOtp[email]}` : null;
  },
  hashOtp: (otp) => `hashed_${otp}`,
  recordOtpAttempt: async () => 1,
  deleteOtp: async (email) => {
    delete mockRedisOtp[email];
  },
  OTP_MAX_ATTEMPTS: 3,
  OTP_TTL_SECONDS: 300
});

class MockUser {
  constructor(data) {
    Object.assign(this, data);
    this._id = `user_${Date.now()}`;
  }
  async save() {
    mockUsers[this.email] = { ...this }; // store deep copy to DB
    return this;
  }
  async comparePassword(pwd) {
    return this.password === pwd;
  }
}

mockRequire(userModelPath, {
  findOne: (query) => {
    const dbData = Object.values(mockUsers).find(u => u.email === query.email);
    const mockQuery = {
      select: () => Promise.resolve(dbData ? new MockUser(dbData) : null)
    };
    mockQuery.then = (resolve) => resolve(dbData ? new MockUser(dbData) : null);
    return mockQuery;
  },
  findById: (id) => {
    const dbData = Object.values(mockUsers).find(u => u._id === id);
    const mockQuery = {
      select: () => Promise.resolve(dbData ? new MockUser(dbData) : null)
    };
    mockQuery.then = (resolve) => resolve(dbData ? new MockUser(dbData) : null);
    return mockQuery;
  },
  create: async (data) => {
    const user = new MockUser(data);
    mockUsers[user.email] = { ...user };
    return user;
  }
});

const authService = require('../src/modules/auth/auth.service');

test('E2E Authentication Flow: Signup -> OTP Verification -> Login', async (t) => {
  // 1. Signup
  const signupResponse = await authService.signup({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  });

  assert.equal(signupResponse.message.includes('Registration successful'), true);
  
  // Verify emails triggered
  assert.equal(emailsSent.length, 2);
  assert.equal(emailsSent[0].type, 'welcome');
  assert.equal(emailsSent[1].type, 'otp');
  assert.equal(emailsSent[1].otp, '123456');

  // Verify DB state
  const dbUser = mockUsers['test@example.com'];
  assert.equal(dbUser.isEmailVerified, false);
  assert.equal(mockRedisOtp['test@example.com'], '123456');

  // 2. Login before verification should fail
  await assert.rejects(
    () => authService.login('test@example.com', 'password123'),
    (error) => error.statusCode === 403 && /verify your email/i.test(error.message)
  );

  // 3. Verify OTP
  const verifyResponse = await authService.verifyOTP('test@example.com', '123456');
  assert.equal(verifyResponse.user.isEmailVerified, true);
  assert.ok(verifyResponse.accessToken);
  assert.ok(verifyResponse.refreshToken);

  // OTP should be deleted from redis
  assert.equal(mockRedisOtp['test@example.com'], undefined);

  // 4. Login after verification should succeed
  const loginResponse = await authService.login('test@example.com', 'password123');
  assert.equal(loginResponse.user.isEmailVerified, true);
  assert.ok(loginResponse.accessToken);
  assert.ok(loginResponse.refreshToken);
});
