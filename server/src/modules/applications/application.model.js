const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Candidate user
      required: true,
    },
    resumeUrl: {
      type: String,
      required: [true, 'Please provide your resume URL'],
    },
    coverLetter: String,
    currentStage: {
      type: String,
      enum: [
        'Applied', 'Viewed', 'Screening', 'Shortlisted', 'Assessment',
        'Interview Round 1', 'Interview Round 2', 'Final Interview',
        'Selected', 'Offer Sent', 'Offer Accepted', 'Hired', 'Onboarded',
        'Rejected'
      ],
      default: 'Applied',
    },
    stageHistory: [
      {
        stage: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      }
    ],
    // Assessment & Score Fields
    assessmentScore: {
      type: Number,
      default: null,
    },
    assessmentStatus: {
      type: String,
      enum: ['Not-Assigned', 'Assigned', 'Completed'],
      default: 'Not-Assigned',
    },
    // Onboarding documents uploads
    onboardingDocuments: [
      {
        docType: String, // Identity Proof, Address Proof, etc.
        fileUrl: String,
        status: {
          type: String,
          enum: ['Pending', 'Verified', 'Rejected'],
          default: 'Pending',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        }
      }
    ],
    internalComments: [
      {
        comment: String,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        }
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications by same candidate to same job
ApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
