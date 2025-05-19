export const EVENTS = {
  JOIN: 'join',
  LEAVE: 'leave',
  UPDATE: 'update'
};

export function registerSocketHandlers(socket) {
  socket.on(EVENTS.JOIN, ({ roomId }) => {
    if (typeof roomId !== 'string') return;
    socket.join(roomId);
    socket.to(roomId).emit(EVENTS.JOIN, { userId: socket.id });
  });

  socket.on(EVENTS.LEAVE, ({ roomId }) => {
    if (typeof roomId !== 'string') return;
    socket.leave(roomId);
    socket.to(roomId).emit(EVENTS.LEAVE, { userId: socket.id });
  });

  socket.on(EVENTS.UPDATE, ({ roomId, payload }) => {
    if (typeof roomId !== 'string') return;
    socket.to(roomId).emit(EVENTS.UPDATE, payload);
  });
}
