import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/env.js';
import { verifyToken } from '../utils/auth.js';

let io: Server | null = null;

export function initializeSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Unauthorized'));
    }

    try {
      const user = verifyToken(token);
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(getUserRoom(userId));
    socket.emit('socket:ready', { userId });
  });

  return io;
}

export function emitMessageCreated(message: unknown, userIds: string[]) {
  if (!io) {
    return;
  }

  const uniqueUserIds = Array.from(new Set(userIds));

  uniqueUserIds.forEach((userId) => {
    io?.to(getUserRoom(userId)).emit('message:created', message);
  });
}

function getUserRoom(userId: string) {
  return `user:${userId}`;
}
