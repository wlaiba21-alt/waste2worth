import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initChatSocket } from './sockets/chat.socket.js';
import { initNotificationSocket } from './sockets/notification.socket.js';

const PORT = process.env.PORT || 5000;

async function start() {
  console.log('Starting Waste2Worth API...');
  await connectDB();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      // ROOT CAUSE FIX 5: Correct fallback frontend port (was wrong 5173 → actual 5180 per vite.config.ts)
      origin: process.env.CLIENT_URL || 'http://localhost:5180',
      methods: ['GET', 'POST'],
    },
  });

  // Make io available globally
  global.io = io;
  
  app.set('io', io);
  initChatSocket(io);
  initNotificationSocket(io);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error('   Stop the other process or set PORT=5001 in backend/.env\n');
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`Waste2Worth API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
