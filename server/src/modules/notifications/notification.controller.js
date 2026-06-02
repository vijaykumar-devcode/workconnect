const notificationService = require('./notification.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await notificationService.getMyNotifications(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: { notifications }
  });
});

const markRead = asyncHandler(async (req, res, next) => {
  const notification = await notificationService.markAsRead(req.params.notificationId, req.user._id);
  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: { notification }
  });
});

const markAllRead = asyncHandler(async (req, res, next) => {
  await notificationService.markAllAsRead(req.user._id);
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: null
  });
});

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};
