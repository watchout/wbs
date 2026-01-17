import { EVENTS, type ScheduleEventPayload } from '../events'

// グローバルにSocket.IOインスタンスを保持
let ioInstance: unknown = null

export function setIOInstance(io: unknown): void {
  ioInstance = io
}

export function getIOInstance(): unknown {
  return ioInstance
}

// 組織にイベントを通知するユーティリティ
export function emitToOrganization(organizationId: string, event: string, data: unknown): void {
  const io = ioInstance as { to: (room: string) => { emit: (event: string, data: unknown) => void } } | null
  if (!io) {
    console.warn('[Socket.IO] Server not initialized, cannot emit')
    return
  }
  const room = `org:${organizationId}`
  io.to(room).emit(event, data)
  console.log(`[Socket.IO] Emitted ${event} to ${room}`)
}

// スケジュール作成通知
export function emitScheduleCreated(payload: ScheduleEventPayload): void {
  emitToOrganization(payload.organizationId, EVENTS.SCHEDULE_CREATED, payload)
}

// スケジュール更新通知
export function emitScheduleUpdated(payload: ScheduleEventPayload): void {
  emitToOrganization(payload.organizationId, EVENTS.SCHEDULE_UPDATED, payload)
}

// スケジュール削除通知
export function emitScheduleDeleted(payload: ScheduleEventPayload): void {
  emitToOrganization(payload.organizationId, EVENTS.SCHEDULE_DELETED, payload)
}
