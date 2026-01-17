import { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import type { NitroApp } from 'nitropack'
import { EVENTS } from '../events'
import { setIOInstance } from '../utils/socket'

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

    io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io'
    })

    // ユーティリティにインスタンスを設定
    setIOInstance(io)

    io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`)

      // 組織別ルームに参加
      socket.on(EVENTS.ROOM_JOIN, (data: { organizationId: string }) => {
        const room = `org:${data.organizationId}`
        socket.join(room)
        console.log(`[Socket.IO] ${socket.id} joined room: ${room}`)
      })

      // ルームから退出
      socket.on(EVENTS.ROOM_LEAVE, (data: { organizationId: string }) => {
        const room = `org:${data.organizationId}`
        socket.leave(room)
        console.log(`[Socket.IO] ${socket.id} left room: ${room}`)
      })

      socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`)
      })
    })

    console.log('[Socket.IO] Server initialized')
  })
})
