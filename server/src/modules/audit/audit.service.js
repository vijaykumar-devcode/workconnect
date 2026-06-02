const AuditLog = require('./audit.model');

class AuditService {
  /**
   * Non-blocking logging function
   */
  async logAction({ adminId, adminName, action, entityType, entityId, details, metadata, ipAddress }) {
    try {
      await AuditLog.create({
        adminId,
        adminName,
        action,
        entityType,
        entityId,
        details,
        metadata,
        ipAddress
      });
    } catch (error) {
      console.error('Audit Logging Failed (Non-blocking):', error.message);
      // We do NOT throw here. Audit logging must not break the primary action.
    }
  }

  async getLogs(filters = {}) {
    const query = {};

    if (filters.actionType) {
      query.action = filters.actionType;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.search) {
      query.$or = [
        { details: { $regex: filters.search, $options: 'i' } },
        { action: { $regex: filters.search, $options: 'i' } },
        { adminName: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Date range
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 15;
    const skip = (page - 1) * limit;

    const sortOrder = filters.sort === 'oldest' ? 1 : -1;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }
}

module.exports = new AuditService();
