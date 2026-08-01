import Message from '../models/Message.js';
import MessageThread from '../models/MessageThread.js';
import { socketAuth } from '../middleware/auth.js';

export function initChatSocket(io) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    socket.on('join_thread', async (threadId) => {
      const thread = await MessageThread.findById(threadId);
      if (!thread) return;
      const allowed =
        thread.userId.toString() === socket.user._id.toString() ||
        thread.vendorId.toString() === socket.user._id.toString();
      if (allowed) socket.join(`thread:${threadId}`);
    });

    socket.on('send_message', async ({ threadId, text }) => {
      if (!text?.trim()) return;
      const thread = await MessageThread.findById(threadId);
      if (!thread) return;
      const allowed =
        thread.userId.toString() === socket.user._id.toString() ||
        thread.vendorId.toString() === socket.user._id.toString();
      if (!allowed) return;

      const message = await Message.create({
        threadId: thread._id,
        senderId: socket.user._id,
        text: text.trim(),
      });
      thread.lastMessageAt = new Date();
      await thread.save();

      io.to(`thread:${threadId}`).emit('new_message', {
        id: message._id.toString(),
        threadId: threadId.toString(),
        senderId: socket.user._id.toString(),
        text: message.text,
        timestamp: message.createdAt,
        seen: false,
      });
    });

    socket.on('typing', ({ threadId }) => {
      socket.to(`thread:${threadId}`).emit('typing', { userId: socket.user._id.toString() });
    });
  });
}
