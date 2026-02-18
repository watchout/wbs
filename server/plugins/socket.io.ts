import { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import type { NitroApp } from 'nitropack'
import { EVENTS } from '../events'
import { setIOInstance } from '../utils/socket'
import { createLogger } from '../utils/logger'

const log = createLogger('socket.io')

let io: SocketIOServer | null = null

export default defineNitroPlugin((nitroApp: NitroApp) => {
  // 本番・開発環境でのみSocket.IOを初期化
  // Nitroの'request'フックでHTTPサーバーにアクセス
  nitroApp.hooks.hook('request', (event) => {
    if (io) return

    // HTTPサーバーを取得（型アサーションで対応）
    const socket = event.node?.req?.socket as { server?: HttpServer } | undefined
    const server = socket?.server
    if (!server) return

    // CORS設定: 許可オリジンを明示指定（SEC-002）
    const allowedOrigins: string[] = []
    const envOrigins = process.env.ALLOWED_ORIGINS
    if (envOrigins) {
      allowedOrigins.push(...envOrigins.split(',').map((o) => o.trim()))
    }
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push(
        'http://localhost:6001',
        'http://localhost:3000',
        'http://127.0.0.1:6001',
        'http://127.0.0.1:3000'
      )
    }

    io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : false,
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io'
    })

    // ユーティリティにインスタンスを設定
    setIOInstance(io)

    io.on('connection', (socket) => {
      log.info('Client connected', { socketId: socket.id })

      // 組織別ルームに参加
      socket.on(EVENTS.ROOM_JOIN, (data: { organizationId: string }) => {
        const room = `org:${data.organizationId}`
        socket.join(room)
        log.info('Client joined room', { socketId: socket.id, room })
      })

      // ルームから退出
      socket.on(EVENTS.ROOM_LEAVE, (data: { organizationId: string }) => {
        const room = `org:${data.organizationId}`
        socket.leave(room)
        log.info('Client left room', { socketId: socket.id, room })
      })

      socket.on('disconnect', (reason) => {
        log.info('Client disconnected', { socketId: socket.id, reason })
      })
    })

    log.info('Server initialized')
  })
})
