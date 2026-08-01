import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', protect, asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json(
    notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      link: n.link || '',
      createdAt: n.createdAt,
    }))
  );
}));

router.patch('/:id/read', protect, asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true });
  res.json({ message: 'OK' });
}));

router.patch('/read-all', protect, asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id }, { read: true });
  res.json({ message: 'OK' });
}));

export default router;
