const authService = require('./auth.service');
const auditService = require('../audit/audit.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const signup = asyncHandler(async (req, res, next) => {
  const result = await authService.signup(req.body);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result
  });
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.status(200).json({
    success: true,
    message: 'Tokens refreshed successfully',
    data: result
  });
});

const logout = asyncHandler(async (req, res, next) => {
  await authService.logout(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: null
  });
});

const getProfile = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: req.user
    }
  });
});

const getPublicProfile = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await authService.getPublicProfile(id);

  res.status(200).json({
    success: true,
    message: 'Public profile retrieved successfully',
    data: {
      user,
    },
  });
});

const updateProfile = asyncHandler(async (req, res, next) => {
  const updatedUser = await authService.updateProfile(req.user._id, req.body);
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: updatedUser
    }
  });
});

// Admin Controllers
const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await authService.getAllUsers();
  res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    data: { users }
  });
});

const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { status } = req.body;
  const user = await authService.updateUserStatus(userId, status);

  // Non-blocking audit log
  let actionEnum = 'USER_SUSPENDED';
  if (status === 'ACTIVE') actionEnum = 'USER_ACTIVATED';
  if (status === 'BANNED') actionEnum = 'USER_BANNED';

  auditService.logAction({
    adminId: req.user._id,
    adminName: req.user.name,
    action: actionEnum,
    entityType: 'USER',
    entityId: user._id,
    details: `Admin changed user status to ${status}`,
    metadata: { userEmail: user.email, userName: user.name }
  });

  res.status(200).json({
    success: true,
    message: `User status changed to ${status}`,
    data: { user }
  });
});

const verifyOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOTP(email, otp);
  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    data: result
  });
});

const resendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const result = await authService.resendOTP(email);
  res.status(200).json({
    success: true,
    message: result.message,
    data: null
  });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(200).json({
    success: true,
    message: result.message,
    data: null
  });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;
  const result = await authService.resetPassword(token, password);
  res.status(200).json({
    success: true,
    message: result.message,
    data: null
  });
});

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getProfile,
  getPublicProfile,
  updateProfile,
  getAllUsers,
  updateUserStatus,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
};
