const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'EMPLOYER', 'RECRUITER', 'CANDIDATE'],
      default: 'CANDIDATE',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED'],
      default: 'ACTIVE', // Employers might require ADMIN approval
    },
    refreshToken: {
      type: String,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    // Candidate Profile Fields (Optional, filled by candidate role)
    phone: String,
    address: String,
    profilePhoto: String,
    currentPosition: String,
    experience: Number, // Years of experience
    skills: [String],
    noticePeriod: String,
    expectedSalary: Number,
    resumeUrl: String,
    education: [
      {
        degree: String,
        institution: String,
        graduationYear: Number,
      }
    ],
    projects: [
      {
        title: String,
        description: String,
        technologies: [String],
      }
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        issueDate: Date,
      }
    ],
    portfolioLinks: {
      github: String,
      linkedin: String,
      website: String,
    },
    // Company Profile Link (for Employers & Recruiters)
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
