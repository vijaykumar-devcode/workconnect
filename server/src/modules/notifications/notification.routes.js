const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { protect } = require('../../middleware/authMiddleware');

router.get('/', protect, notificationController.getNotifications);
router.put('/mark-all', protect, notificationController.markAllRead);
router.put('/:notificationId', protect, notificationController.markRead);

module.exports = router;
