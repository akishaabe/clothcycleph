import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function getSocket() {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  } else {
    socket.auth = { token };
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
