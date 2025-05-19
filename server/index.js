import { createServer } from 'http';
import { Server } from 'socket.io';

const EVENTS = {
  JOIN: 'join',
  LEAVE: 'leave',
  UPDATE: 'update'
};

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
  const { roomId } = socket.handshake.query;
  socket.join(roomId);
  console.log('client connected', socket.id, 'room', roomId);

  socket.on(EVENTS.JOIN, ({ roomId: joinRoom }) => {
    if (typeof joinRoom !== 'string') return;
    socket.join(joinRoom);
    socket.to(joinRoom).emit(EVENTS.JOIN, { userId: socket.id });
  });

  socket.on(EVENTS.LEAVE, ({ roomId: leaveRoom }) => {
    if (typeof leaveRoom !== 'string') return;
    socket.leave(leaveRoom);
    socket.to(leaveRoom).emit(EVENTS.LEAVE, { userId: socket.id });
  });

  socket.on(EVENTS.UPDATE, ({ roomId: targetRoom, payload }) => {
    if (typeof targetRoom !== 'string') return;
    socket.to(targetRoom).emit(EVENTS.UPDATE, payload);
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
});
