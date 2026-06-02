const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema(
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
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Recruiter or Employer
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Please schedule the interview date and time'],
    },
    duration: {
      type: Number, // In minutes
      default: 45,
    },
    link: {
      type: String, // Interview Video URL (Optional if INTERNAL_ROOM)
    },
    roomType: {
      type: String,
      enum: ['EXTERNAL', 'INTERNAL_ROOM'],
      default: 'EXTERNAL'
    },
    roomMetadata: {
      livekitRoomName: String,
      actualStartTime: Date,
      actualEndTime: Date,
    },
    type: {
      type: String,
      enum: ['HR Interview', 'Technical Interview', 'Manager Interview', 'Final Interview'],
      default: 'Technical Interview',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled',
    },
    feedback: String,
    rating: {
      type: Number, // 1 to 5 stars
      min: 1,
      max: 5,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Interview', InterviewSchema);
