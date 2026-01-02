/**
 * Schedule Formatter Utility
 * 
 * スケジュールの表示テキスト整形を担当
 * 
 * Phase 0: 既存フィールド（description）を活用してメタデータを扱う
 * - description にJSON文字列を格納してメタデータを保存
 * - プレーンテキストの場合はそのまま使用
 */

interface ScheduleMetadata {
  siteName?: string      // 現場名（例: "◯◯ホテル"）
  activityType?: string  // 用件（例: "工事", "打合せ", "保守"）
}

interface Schedule {
  id: string
  title: string
  description?: string | null
  start: Date
  end: Date
}

/**
 * 時刻をフォーマット（HH形式）
 * 
 * @param date - Date オブジェクト
 * @returns 時刻文字列（例: "9", "18"）
 */
export function formatTime(date: Date): string {
  return date.getHours().toString()
}

/**
 * description からメタデータを抽出
 * 
 * @param description - スケジュールのdescription（JSON文字列 or プレーンテキスト）
 * @returns パースされたメタデータ
 */
export function parseScheduleMetadata(description?: string | null): ScheduleMetadata {
  if (!description) {
    return {}
  }

  // JSON形式かどうかを判定（先頭が "{" で始まる）
  if (description.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(description)
      return {
        siteName: parsed.siteName,
        activityType: parsed.activityType
      }
    } catch (error) {
      // JSONパースに失敗した場合は空のメタデータを返す
      console.warn('Failed to parse schedule metadata:', error)
      return {}
    }
  }

  // プレーンテキストの場合は空のメタデータ
  return {}
}

/**
 * スケジュールを表示用テキストにフォーマット
 * 
 * 表示形式:
 * - 通常: "9-18 ◯◯ホテル 工事"
 * - メタデータなし: "9-18 会議"
 * - 終日: "終日 研修"
 * 
 * @param schedule - Scheduleオブジェクト
 * @returns 表示用テキスト
 */
export function formatScheduleForDisplay(schedule: Schedule): string {
  const metadata = parseScheduleMetadata(schedule.description)

  // 開始・終了時刻
  const startHour = formatTime(schedule.start)
  const endHour = formatTime(schedule.end)

  // 終日判定（開始0時、終了が翌日0時 = 24時間以上の差）
  const durationMs = schedule.end.getTime() - schedule.start.getTime()
  const durationHours = durationMs / (1000 * 60 * 60)
  const isAllDay = startHour === '0' && endHour === '0' && durationHours >= 24

  // 時刻部分
  let timePart = ''
  if (isAllDay) {
    timePart = '終日'
  } else if (startHour === endHour) {
    timePart = `${startHour}時`
  } else {
    timePart = `${startHour}-${endHour}`
  }

  // 表示テキストの組み立て
  const parts: string[] = [timePart]

  // 現場名
  if (metadata.siteName) {
    parts.push(metadata.siteName)
  }

  // 用件（activityType または title）
  if (metadata.activityType) {
    parts.push(metadata.activityType)
  } else if (schedule.title) {
    parts.push(schedule.title)
  }

  return parts.filter(Boolean).join(' ')
}

/**
 * スケジュール作成時にメタデータをdescriptionに格納
 * 
 * @param siteName - 現場名
 * @param activityType - 用件
 * @returns JSON文字列化されたメタデータ
 */
export function createScheduleMetadata(
  siteName?: string,
  activityType?: string
): string {
  const metadata: ScheduleMetadata = {}

  if (siteName) {
    metadata.siteName = siteName
  }

  if (activityType) {
    metadata.activityType = activityType
  }

  // メタデータが空の場合は空文字列を返す
  if (Object.keys(metadata).length === 0) {
    return ''
  }

  return JSON.stringify(metadata)
}

/**
 * 休日判定
 * 
 * @param schedule - Scheduleオブジェクト
 * @returns 休日かどうか
 */
export function isHoliday(schedule: Schedule): boolean {
  // titleに「休」が含まれる場合は休日とみなす
  return schedule.title?.includes('休') || false
}

/**
 * 週の開始日を取得（月曜日開始）
 * 
 * @param date - 基準日
 * @returns 週の開始日（月曜日 00:00:00）
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 (日) ~ 6 (土)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 月曜日を計算
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

/**
 * 週の終了日を取得（次の月曜日 00:00:00）
 * 
 * @param date - 基準日
 * @returns 週の終了日（次の月曜日 00:00:00）
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  return weekEnd
}
