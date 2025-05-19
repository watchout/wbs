# Realtime Socket Events

*Japanese version: [socket_events.ja.md](./socket_events.ja.md)*

This document describes the event names and JSON payloads exchanged over the Socket.IO connection. All events are scoped to a room identified by the `roomId` passed during the connection handshake.

| Event name | Direction | Payload |
|------------|-----------|--------|
| `room:join` | server -> all clients in room | `{ "userId": string }` |
| `room:leave` | server -> all clients in room | `{ "userId": string }` |
| `room:update` | client -> server -> broadcast | `{ "schedule": Schedule }` |

`Schedule` follows the structure defined in [`openapi.yaml`](../openapi.yaml) under `components/schemas/Schedule`.
