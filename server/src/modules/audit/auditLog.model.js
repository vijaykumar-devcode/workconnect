const mongoose = require('mongoose');

const InterviewAuditLogSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['JOINED_ROOM', 'LEFT_ROOM', 'CHAT_MESSAGE', 'WHITEBOARD_EVENT', 'TIMER_EXTEND', 'ENDED_INTERVIEW', 'SUBMITTED_FEEDBACK'],
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.InterviewAuditLog || mongoose.model('InterviewAuditLog', InterviewAuditLogSchema);
