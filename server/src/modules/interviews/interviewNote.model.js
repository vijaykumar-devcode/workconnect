const mongoose = require('mongoose');

const InterviewNoteSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      unique: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    privateFeedback: {
      type: String,
    },
    technicalScore: {
      type: Number,
      min: 1,
      max: 10,
    },
    communicationScore: {
      type: Number,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InterviewNote', InterviewNoteSchema);
