const Notification = require('./notification.model');
const logger = require('../../utils/logger');

class NotificationService {
  async triggerNotification(data) {
    const { recipientId, senderId, title, message, link, type } = data;

    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId || null,
      title,
      message,
      link,
      type: type || 'In-App'
    });

    // Email Notification Simulator as requested
    if (type === 'Email' || type === 'Both') {
      logger.info(`✉️ SIMULATED EMAIL SENT TO USER [${recipientId}]:`);
      logger.info(`Subject: ${title}`);
      logger.info(`Message: ${message}`);
      logger.info(`Link: ${link || 'N/A'}`);
      logger.info('----------------------------------------------------');
    }

    return notification;
  }

  async getMyNotifications(userId) {
    return await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    return true;
  }
}

module.exports = new NotificationService();
