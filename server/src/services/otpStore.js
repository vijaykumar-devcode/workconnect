const crypto = require('crypto');
const { getRedisClient, closeRedisClient } = require('./redisClient');

const OTP_TTL_SECONDS = 10 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_KEY_PREFIX = 'workconnect:otp:';
const OTP_ATTEMPT_KEY_PREFIX = 'workconnect:otp-attempts:';
const OTP_RESEND_KEY_PREFIX = 'workconnect:otp-resend:';

const getOtpKey = (email) => `${OTP_KEY_PREFIX}${String(email).trim().toLowerCase()}`;
const getAttemptKey = (email) => `${OTP_ATTEMPT_KEY_PREFIX}${String(email).trim().toLowerCase()}`;
const getResendKey = (email) => `${OTP_RESEND_KEY_PREFIX}${String(email).trim().toLowerCase()}`;

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const setOtp = async (email, otp) => {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  const otpKey = getOtpKey(email);
  const attemptKey = getAttemptKey(email);
  await client
    .multi()
    .set(otpKey, hashOtp(otp), 'EX', OTP_TTL_SECONDS)
    .del(attemptKey)
    .exec();
  return true;
};

const getOtpHash = async (email) => {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  return await client.get(getOtpKey(email));
};

const deleteOtp = async (email) => {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  await client.del(getOtpKey(email), getAttemptKey(email), getResendKey(email));
  return true;
};

const recordOtpAttempt = async (email) => {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  const attempts = await client.incr(getAttemptKey(email));
  if (attempts === 1) {
    await client.expire(getAttemptKey(email), OTP_TTL_SECONDS);
  }

  return attempts;
};

const getOtpAttemptCount = async (email) => {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  const attempts = await client.get(getAttemptKey(email));
  return attempts ? Number(attempts) : 0;
};

const canResendOtp = async (email) => {
  const client = getRedisClient();
  if (!client) {
    return true;
  }

  const blocked = await client.get(getResendKey(email));
  return !blocked;
};

const markOtpResendCooldown = async (email) => {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  await client.set(getResendKey(email), '1', 'EX', OTP_RESEND_COOLDOWN_SECONDS);
  return true;
};

const close = async () => {
  await closeRedisClient();
};

module.exports = {
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  canResendOtp,
  close,
  deleteOtp,
  generateOtp,
  getOtpHash,
  getOtpAttemptCount,
  hashOtp,
  markOtpResendCooldown,
  recordOtpAttempt,
  setOtp,
};