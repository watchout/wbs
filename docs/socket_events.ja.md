# リアルタイムソケットイベント

*English version: [socket_events.md](./socket_events.md)*

このドキュメントでは、Socket.IO 接続でやり取りされるイベント名と JSON 形式のペイロードを示します。接続時の `roomId` に基づき、すべてのイベントはルーム単位で処理されます。

| イベント名 | 方向 | ペイロード |
|-------------|------|-----------|
| `room:join` | サーバー → ルーム内全クライアント | `{ "userId": string }` |
| `room:leave` | サーバー → ルーム内全クライアント | `{ "userId": string }` |
| `room:update` | クライアント → サーバー → ブロードキャスト | `{ "schedule": Schedule }` |

`Schedule` の構造は [`openapi.yaml`](../openapi.yaml) の `components/schemas/Schedule` を参照してください。
