const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Please state the subject of your support query'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Please explain your inquiry or technical issue'],
    },
    status: {
      type: String,
      enum: ['Open', 'In-Progress', 'Resolved', 'Escalated'],
      default: 'Open',
    },
    responses: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        message: {
          type: String,
          required: true,
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

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
