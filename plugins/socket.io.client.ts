import { io, Socket } from 'socket.io-client'
import { createClientLogger } from '~/utils/clientLogger'

const log = createClientLogger('Socket.IO')

// イベント定数（サーバー側と同期）
export const EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  SCHEDULE_CREATED: 'schedule:created',
  SCHEDULE_UPDATED: 'schedule:updated',
  SCHEDULE_DELETED: 'schedule:deleted'
} as const

let socket: Socket | null = null

export default defineNuxtPlugin(() => {
  // クライアントサイドでのみ実行
  if (import.meta.server) return

  return {
    provide: {
      socketIO: {
        // Socket.IO接続を取得または作成
        connect(): Socket {
          if (socket?.connected) {
            return socket
          }

          const url = window.location.origin
          socket = io(url, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
          })

          // 接続イベント
          socket.on('connect', () => {
            log.info('Connected', { socketId: socket?.id })
          })

          socket.on('disconnect', (reason) => {
            log.info('Disconnected', { reason })
          })

          socket.on('connect_error', (error) => {
            log.error('Connection error', { message: error.message })
          })

          socket.on('reconnect', (attemptNumber) => {
            log.info('Reconnected', { attemptNumber })
          })

          socket.on('reconnect_attempt', (attemptNumber) => {
            log.debug('Reconnection attempt', { attemptNumber })
          })

          return socket
        },

        // 接続を切断
        disconnect(): void {
          if (socket) {
            socket.disconnect()
            socket = null
            log.info('Manually disconnected')
          }
        },

        // 組織ルームに参加
        joinOrganization(organizationId: string): void {
          const s = this.connect()
          s.emit(EVENTS.ROOM_JOIN, { organizationId })
          log.info('Joining organization', { organizationId })
        },

        // 組織ルームから退出
        leaveOrganization(organizationId: string): void {
          if (socket) {
            socket.emit(EVENTS.ROOM_LEAVE, { organizationId })
            log.info('Leaving organization', { organizationId })
          }
        },

        // スケジュール変更イベントを監視
        onScheduleChange(callback: (data: { scheduleId: string; organizationId: string }) => void): () => void {
          const s = this.connect()

          const handler = (data: { scheduleId: string; organizationId: string }) => {
            log.debug('Schedule change received', { scheduleId: data.scheduleId, organizationId: data.organizationId })
            callback(data)
          }

          s.on(EVENTS.SCHEDULE_CREATED, handler)
          s.on(EVENTS.SCHEDULE_UPDATED, handler)
          s.on(EVENTS.SCHEDULE_DELETED, handler)

          // クリーンアップ関数を返す
          return () => {
            s.off(EVENTS.SCHEDULE_CREATED, handler)
            s.off(EVENTS.SCHEDULE_UPDATED, handler)
            s.off(EVENTS.SCHEDULE_DELETED, handler)
          }
        },

        // 接続状態を取得
        isConnected(): boolean {
          return socket?.connected ?? false
        },

        // ソケットインスタンスを取得
        getSocket(): Socket | null {
          return socket
        }
      }
    }
  }
})
