const User = require('./user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { AppError } = require('../../middleware/errorHandler');
const emailService = require('../../services/emailService');
const { requireJwtSecret } = require('../../utils/jwtSecrets');

const JWT_SECRET = requireJwtSecret('JWT_SECRET');
const JWT_REFRESH_SECRET = requireJwtSecret('JWT_REFRESH_SECRET');

const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

class AuthService {
  async signup(userData) {
    const { name, email, password, role } = userData;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'CANDIDATE',
      status: 'ACTIVE',
      isEmailVerified: false,
      otp,
      otpExpires
    });

    // Trigger Welcome & OTP Email
    emailService.welcomeEmail(user);
    emailService.otpEmail(user, otp);

    user.password = undefined;
    user.otp = undefined;
    user.otpExpires = undefined;

    return { user, message: 'Registration successful. Please verify your email with the OTP sent to you.' };
  }


  async login(email, password) {
    const user = await User.findOne({ email }).select('+password +isEmailVerified');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Incorrect email or password', 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email to login. Verification required.', 403);
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('Your account is suspended', 403);
    }
    if (user.status === 'BANNED') {
      throw new AppError('Your account has been banned', 403);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    user.password = undefined;

    return { user, accessToken, refreshToken };
  }

  async refresh(token) {
    if (!token) {
      throw new AppError('Refresh token is required', 400);
    }

    try {
      const decoded = jwt.verify(
        token,
        JWT_REFRESH_SECRET
      );

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Verify token matches stored token
      const dbUser = await User.findById(decoded.id).select('+refreshToken');
      if (dbUser.refreshToken !== token) {
        throw new AppError('Invalid refresh token', 401);
      }

      const accessToken = generateAccessToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      user.refreshToken = newRefreshToken;
      await user.save();

      return { accessToken, refreshToken: newRefreshToken, user };
    } catch (err) {
      throw new AppError('Invalid refresh token or token expired', 401);
    }
  }

  async verifyOTP(email, otp) {
    const user = await User.findOne({ email }).select('+otp +otpExpires');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;

    await user.save();

    return { user, accessToken, refreshToken };
  }

  async resendOTP(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    emailService.otpEmail(user, otp);
    return { message: 'A new OTP has been sent to your email.' };
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('There is no user with that email address', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    try {
      await emailService.passwordResetEmail(user, resetToken);
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new AppError('There was an error sending the email. Try again later!', 500);
    }

    return { message: 'Token sent to email!' };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Token is invalid or has expired', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return { message: 'Password has been reset successfully. Please login.' };
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return true;
  }

  async updateProfile(userId, profileData) {
    // Prevent modification of password and roles through this service
    delete profileData.password;
    delete profileData.role;
    delete profileData.status;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: profileData },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async getAllUsers() {
    return await User.find().select('-refreshToken');
  }

  async getPublicProfile(userId) {
    const user = await User.findById(userId)
      .select('name role phone address profilePhoto currentPosition experience skills noticePeriod expectedSalary resumeUrl education projects certifications portfolioLinks createdAt')
      .lean();

    if (!user || user.role !== 'CANDIDATE') {
      throw new AppError('Public profile not found', 404);
    }

    return {
      id: user._id,
      name: user.name,
      role: user.role,
      profilePhoto: user.profilePhoto || null,
      currentPosition: user.currentPosition || '',
      experience: user.experience ?? null,
      skills: Array.isArray(user.skills) ? user.skills : [],
      noticePeriod: user.noticePeriod || '',
      expectedSalary: user.expectedSalary ?? null,
      resumeUrl: user.resumeUrl || '',
      education: Array.isArray(user.education) ? user.education : [],
      projects: Array.isArray(user.projects) ? user.projects : [],
      certifications: Array.isArray(user.certifications) ? user.certifications : [],
      portfolioLinks: user.portfolioLinks || {},
      createdAt: user.createdAt,
    };
  }

  async updateUserStatus(userId, status) {
    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      throw new AppError('Invalid status value', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}

module.exports = new AuthService();
