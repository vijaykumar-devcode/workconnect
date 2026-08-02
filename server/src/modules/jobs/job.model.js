const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a job title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a job description'],
    },
    skillsRequired: {
      type: [String],
      required: [true, 'Please provide the required skills'],
    },
    experienceRequired: {
      type: Number, // Years
      required: [true, 'Please provide the required years of experience'],
    },
    salaryRange: {
      min: Number,
      max: Number,
    },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract'],
      default: 'Full-Time',
    },
    workMode: {
      type: String,
      enum: ['Remote', 'Hybrid', 'Onsite'],
      default: 'Onsite',
    },
    location: {
      type: String,
      required: [true, 'Please provide the job location'],
    },
    numberOfOpenings: {
      type: Number,
      default: 1,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Please specify the application deadline'],
    },
    status: {
      type: String,
      enum: ['Draft', 'Moderation', 'Published', 'Paused', 'Closed'],
      default: 'Draft', // Submitted -> Moderation (Admin review) -> Published
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    assignedRecruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assigned Recruiter
    },
    publisher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Employer who posted it
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for search
JobSchema.index({ title: 'text', description: 'text', location: 'text' });

// Add explicit indexes for common filter queries
JobSchema.index({ status: 1 });
JobSchema.index({ company: 1 });
JobSchema.index({ publisher: 1 });
JobSchema.index({ assignedRecruiter: 1 });

module.exports = mongoose.model('Job', JobSchema);
