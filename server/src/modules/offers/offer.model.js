const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salary: {
      type: Number,
      required: [true, 'Please specify the offered base salary'],
      min: [1, 'Salary must be greater than 0'],
    },
    bonus: {
      type: Number,
      default: 0,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Please specify the target joining date'],
    },
    benefits: [String],
    notes: String,
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired'],
      default: 'Draft',
    }
    ,
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statusSource: {
      type: String,
      enum: ['CANDIDATE', 'EMPLOYER', 'RECRUITER', 'ADMIN']
    }
  },
  {
    timestamps: true,
  }
);

// Indexes to support candidate and application offer fetching with sorting
OfferSchema.index({ candidate: 1, createdAt: -1 });
OfferSchema.index({ application: 1, createdAt: -1 });

module.exports = mongoose.model('Offer', OfferSchema);
