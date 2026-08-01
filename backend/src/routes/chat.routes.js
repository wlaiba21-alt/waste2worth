import { Router } from 'express';
import MessageThread from '../models/MessageThread.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from '../services/notify.js';

const router = Router();

router.get(
  '/threads',
  protect,
  asyncHandler(async (req, res) => {
    const filter =
      req.user.role === 'vendor'
        ? { vendorId: req.user._id }
        : { userId: req.user._id };
    const threads = await MessageThread.find(filter).sort({ lastMessageAt: -1 });
    const result = await Promise.all(
      threads.map(async (t) => {
        const otherId = req.user.role === 'vendor' ? t.userId : t.vendorId;
        const other = await User.findById(otherId).select('name avatar role');
        let displayName = other?.name;
        if (other?.role === 'vendor') {
          const vp = await VendorProfile.findOne({ userId: otherId });
          displayName = vp?.businessName || displayName;
        }
        const lastMsg = await Message.findOne({ threadId: t._id }).sort({ createdAt: -1 });
        const unread = await Message.countDocuments({
          threadId: t._id,
          senderId: { $ne: req.user._id },
          seen: false,
        });
        return {
          threadId: t._id.toString(),
          userId: t.userId.toString(),
          vendorId: t.vendorId.toString(),
          otherParticipant: { id: otherId.toString(), name: displayName, avatar: other?.avatar },
          lastMessage: lastMsg?.text || '',
          lastMessageAt: t.lastMessageAt,
          unread,
        };
      })
    );
    res.json(result);
  })
);

router.post(
  '/threads',
  protect,
  asyncHandler(async (req, res) => {
    const { vendorId, userId } = req.body;
    let uid, vid;
    if (req.user.role === 'user') {
      uid = req.user._id;
      vid = vendorId;
    } else {
      uid = userId;
      vid = req.user._id;
    }
    if (!uid || !vid) return res.status(400).json({ message: 'vendorId or userId required' });

    let thread = await MessageThread.findOne({ userId: uid, vendorId: vid });
    if (!thread) thread = await MessageThread.create({ userId: uid, vendorId: vid });
    res.json({ threadId: thread._id.toString() });
  })
);

router.get(
  '/threads/:threadId/messages',
  protect,
  asyncHandler(async (req, res) => {
    const thread = await MessageThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    const allowed =
      thread.userId.toString() === req.user._id.toString() ||
      thread.vendorId.toString() === req.user._id.toString();
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const messages = await Message.find({ threadId: thread._id }).sort({ createdAt: 1 });
    await Message.updateMany(
      { threadId: thread._id, senderId: { $ne: req.user._id } },
      { seen: true }
    );
    res.json({
      threadId: thread._id.toString(),
      userId: thread.userId.toString(),
      vendorId: thread.vendorId.toString(),
      messages: messages.map((m) => ({
        id: m._id.toString(),
        senderId: m.senderId.toString(),
        text: m.text,
        timestamp: m.createdAt,
        seen: m.seen,
      })),
    });
  })
);

router.post(
  '/threads/:threadId/messages',
  protect,
  asyncHandler(async (req, res) => {
    const thread = await MessageThread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    const allowed =
      thread.userId.toString() === req.user._id.toString() ||
      thread.vendorId.toString() === req.user._id.toString();
    if (!allowed) return res.status(403).json({ message: 'Forbidden' });

    const message = await Message.create({
      threadId: thread._id,
      senderId: req.user._id,
      text: req.body.text,
    });
    thread.lastMessageAt = new Date();
    await thread.save();

    const recipientId =
      thread.userId.toString() === req.user._id.toString() ? thread.vendorId : thread.userId;
    let senderLabel = req.user.name;
    if (req.user.role === 'vendor') {
      const vp = await VendorProfile.findOne({ userId: req.user._id });
      senderLabel = vp?.businessName || senderLabel;
    }
    await createNotification(recipientId, {
      type: 'info',
      title: 'New chat message',
      message: `${senderLabel}: ${req.body.text.trim().slice(0, 120)}`,
      link: `/chat/${thread._id}`,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`thread:${thread._id}`).emit('new_message', {
        id: message._id.toString(),
        threadId: thread._id.toString(),
        senderId: req.user._id.toString(),
        text: message.text,
        timestamp: message.createdAt,
        seen: false,
      });
    }

    res.status(201).json({
      id: message._id.toString(),
      senderId: message.senderId.toString(),
      text: message.text,
      timestamp: message.createdAt,
      seen: false,
    });
  })
);

export default router;
