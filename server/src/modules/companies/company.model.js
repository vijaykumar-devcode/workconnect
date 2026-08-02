const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the company name'],
      trim: true,
      unique: true,
    },
    logo: {
      type: String, // Logo URL
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Please provide a company description'],
    },
    industry: {
      type: String,
      required: [true, 'Please specify the industry'],
    },
    website: String,
    location: {
      type: String,
      required: [true, 'Please provide the location'],
    },
    benefits: [String],
    gallery: [String], // Array of images
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recruiters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    isVerified: {
      type: Boolean,
      default: false, // Pending Admin Approval
    },
  },
  {
    timestamps: true,
  }
);

// Optimize owner lookups in auth/employer flows
CompanySchema.index({ owner: 1 });

module.exports = mongoose.model('Company', CompanySchema);
