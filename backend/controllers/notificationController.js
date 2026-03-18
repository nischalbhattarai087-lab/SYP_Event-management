const NotificationModel = require('../models/notificationModel');

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.findByUser(req.user.id);
    const unreadCount = await NotificationModel.countUnread(req.user.id);
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notif = await NotificationModel.markRead(req.params.id, req.user.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await NotificationModel.markAllRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
