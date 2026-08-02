const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { validateSignup, validateLogin } = require('./auth.validation');
const { protect, authorize } = require('../../middleware/authMiddleware');
const { authLimiter, otpLimiter } = require('../../middleware/rateLimiter');

// Public
router.post('/signup', authLimiter, validateSignup, authController.signup);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.get('/public/:id', authController.getPublicProfile);
router.post('/verify-otp', otpLimiter, authController.verifyOTP);
router.post('/resend-otp', otpLimiter, authController.resendOTP);
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password/:token', otpLimiter, authController.resetPassword);

// Protected (Candidates/Employers/Recruiters/Admins)
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getProfile);
router.put('/me', protect, authController.updateProfile);

// Admin Only
router.get('/users', protect, authorize('ADMIN'), authController.getAllUsers);
router.put('/users/:userId/status', protect, authorize('ADMIN'), authController.updateUserStatus);

module.exports = router;
