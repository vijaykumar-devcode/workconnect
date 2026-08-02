const mongoose = require('mongoose');

const AdminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        'USER_SUSPENDED',
        'USER_ACTIVATED',
        'USER_BANNED',
        'COMPANY_APPROVED',
        'COMPANY_REJECTED',
        'COMPANY_SUSPENDED',
        'JOB_PUBLISHED', // From moderateJob
        'JOB_CLOSED',
        'JOB_PAUSED',
        'JOB_HELD',
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['USER', 'COMPANY', 'JOB'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports = mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', AdminAuditLogSchema);
