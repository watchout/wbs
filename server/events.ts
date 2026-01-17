// Socket.IO イベント定義
export const EVENTS = {
  // ルーム管理
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_UPDATE: 'room:update',

  // スケジュール関連
  SCHEDULE_CREATED: 'schedule:created',
  SCHEDULE_UPDATED: 'schedule:updated',
  SCHEDULE_DELETED: 'schedule:deleted'
} as const

// 型定義
export type EventName = typeof EVENTS[keyof typeof EVENTS]

// イベントペイロード型
export interface ScheduleEventPayload {
  scheduleId: string
  organizationId: string
  employeeId?: string
}

export interface RoomJoinPayload {
  organizationId: string
}

export interface RoomLeavePayload {
  organizationId: string
}
