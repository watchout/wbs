import { createServer } from 'http';
import { Server } from 'socket.io';


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
  // minimal placeholder handlers
  socket.on('disconnect', () => {
    // noop
  });
});

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
});
