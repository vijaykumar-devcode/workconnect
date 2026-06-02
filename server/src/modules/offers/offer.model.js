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

module.exports = mongoose.model('Offer', OfferSchema);
