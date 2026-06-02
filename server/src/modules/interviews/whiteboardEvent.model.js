const mongoose = require('mongoose');

const WhiteboardEventSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true,
    },
    batchSequence: {
      type: Number,
      required: true,
    },
    events: [
      {
        eventType: {
          type: String,
          enum: ['draw_line', 'clear', 'add_entity', 'add_relation', 'draw_shape', 'text', 'upsert_object', 'remove_object'],
        },
        payload: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ensure sequence is unique per interview
WhiteboardEventSchema.index({ interview: 1, batchSequence: 1 }, { unique: true });

module.exports = mongoose.model('WhiteboardEvent', WhiteboardEventSchema);
