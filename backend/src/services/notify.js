import Notification from '../models/Notification.js';
import { emitToUser, emitToUsers } from '../sockets/notification.socket.js';

export async function createNotification(userId, { type = 'info', title, message, link = '' }) {
  const notification = await Notification.create({ userId, type, title, message, link });
  const formattedNotification = {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    read: notification.read,
    link: notification.link,
    createdAt: notification.createdAt,
  };
  emitToUser(userId, 'new_notification', formattedNotification);
  return notification;
}

export async function createMultipleNotifications(userIds, { type = 'info', title, message, link = '' }) {
  const notifications = userIds.map(userId => ({
    userId,
    type,
    title,
    message,
    link
  }));
  const created = await Notification.insertMany(notifications);
  created.forEach(notification => {
    const formatted = {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      link: notification.link,
      createdAt: notification.createdAt,
    };
    emitToUser(notification.userId, 'new_notification', formatted);
  });
  return created;
}
