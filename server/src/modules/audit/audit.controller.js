const auditService = require('./audit.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const getLogs = asyncHandler(async (req, res, next) => {
  const result = await auditService.getLogs(req.query);
  res.status(200).json({
    success: true,
    message: 'Audit logs retrieved successfully',
    data: result
  });
});

module.exports = {
  getLogs
};
