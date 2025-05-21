import { createServer } from 'http';
import { Server } from 'socket.io';
import Ajv from 'ajv';
import { Events, Schemas } from './events.js';

const httpServer = createServer();
const allowedOrigins = process.env.APP_BASE_URL
  ? process.env.APP_BASE_URL.split(',')
  : '*';
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins
  }
});

const ajv = new Ajv();
const validators = Object.fromEntries(
  Object.entries(Schemas).map(([event, schema]) => [event, ajv.compile(schema)])
);

function withValidation(socket, event, handler) {
  const validate = validators[event];
  return (payload) => {
    if (validate && !validate(payload)) {
      socket.emit('error', {
        message: 'invalid payload',
        errors: validate.errors
      });
      return;
    }
    handler(payload);
  };
}

io.use((socket, next) => {
  const { roomId } = socket.handshake.query;
  if (!roomId) {
    return next(new Error('roomId required'));
  }
  next();
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on(
    Events.JOIN,
    withValidation(socket, Events.JOIN, () => {
      socket.join(socket.handshake.query.roomId);
    })
  );

  socket.on(
    Events.LEAVE,
    withValidation(socket, Events.LEAVE, () => {
      socket.leave(socket.handshake.query.roomId);
    })
  );

  socket.on(
    Events.UPDATE,
    withValidation(socket, Events.UPDATE, (payload) => {
      io.to(socket.handshake.query.roomId).emit(Events.UPDATE, payload);
    })
  );
});

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`Socket.IO server running on port ${port}`);
});
