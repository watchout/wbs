import { createServer } from 'http';
import { Server } from 'socket.io';
import { EVENTS } from './events.js';

const httpServer = createServer();
const allowedOrigins = process.env.APP_BASE_URL
  ? process.env.APP_BASE_URL.split(',')
  : '*';
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins
  }
});

io.use((socket, next) => {
  const { roomId } = socket.handshake.query;
  if (!roomId) {
    return next(new Error('roomId required'));
  }
  next();
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('client disconnected', socket.id, reason);
  });
});

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
});
