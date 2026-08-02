const mongoose = require('mongoose');

/**
 * WhiteboardScene — stores the latest Excalidraw scene state per interview.
 *
 * Migration note: This schema replaces the old event-log model that stored
 * individual draw commands (draw_line, draw_shape, upsert_object, etc.).
 * The new approach stores a single snapshot of the full Excalidraw scene
 * JSON, which is upserted on every sync event. Old WhiteboardEvent documents
 * (if any) remain in the collection but are no longer read or written.
 */
const WhiteboardSceneSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      unique: true, // One scene document per interview
      index: true,
    },
    /**
     * The full Excalidraw scene serialized as JSON string.
     * Shape: { elements: ExcalidrawElement[], appState: Partial<AppState> }
     * Stored as a string to avoid Mongoose mixed-type overhead and to allow
     * the client to parse it directly with Excalidraw's own utilities.
     */
    scene: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt maintained automatically
  }
);

module.exports = mongoose.model('WhiteboardScene', WhiteboardSceneSchema);
