import { socketAuth } from '../middleware/auth.js';

const userSockets = new Map(); // userId -> array of socket ids

export function initNotificationSocket(io) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    // Track connected user
    const userId = socket.user._id.toString();
    if (!userSockets.has(userId)) {
      userSockets.set(userId, []);
    }
    userSockets.get(userId).push(socket.id);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });
}

export function emitToUser(userId, event, data) {
  const socketIds = userSockets.get(userId.toString());
  if (socketIds && socketIds.length > 0) {
    const io = global.io;
    if (io) {
      socketIds.forEach(socketId => {
        io.to(socketId).emit(event, data);
      });
    }
  }
}

export function emitToUsers(userIds, event, data) {
  userIds.forEach(userId => emitToUser(userId, event, data));
}

export function emitToAll(event, data) {
  if (global.io) {
    global.io.emit(event, data);
  }
}