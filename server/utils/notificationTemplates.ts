/**
 * 通知テンプレート（NOTIF-001）
 *
 * スケジュール変更通知のメールテンプレート
 */

interface ScheduleNotifyData {
  scheduleTitle: string
  changedBy: string
  changeType: 'created' | 'updated' | 'deleted'
  start?: string
  end?: string
  orgName: string
  boardUrl: string
}

/**
 * 変更種別の日本語ラベル
 */
function getChangeLabel(type: ScheduleNotifyData['changeType']): string {
  const labels: Record<string, string> = {
    created: '新規作成',
    updated: '更新',
    deleted: '削除',
  }
  return labels[type] || type
}

/**
 * スケジュール変更通知メール（テキスト版）
 */
export function scheduleChangeText(data: ScheduleNotifyData): string {
  const label = getChangeLabel(data.changeType)
  const lines = [
    `【${data.orgName}】スケジュール${label}のお知らせ`,
    '',
    `${data.changedBy} さんがスケジュールを${label}しました。`,
    '',
    `■ タイトル: ${data.scheduleTitle}`,
  ]

  if (data.start && data.end) {
    lines.push(`■ 日時: ${data.start} 〜 ${data.end}`)
  }

  lines.push(
    '',
    `週間ボードで確認: ${data.boardUrl}`,
    '',
    '---',
    'このメールは ミエルボード for 現場 から自動送信されています。'
  )

  return lines.join('\n')
}

/**
 * スケジュール変更通知メール（HTML版）
 */
export function scheduleChangeHtml(data: ScheduleNotifyData): string {
  const label = getChangeLabel(data.changeType)
  const colorMap: Record<string, string> = {
    created: '#388e3c',
    updated: '#1a73e8',
    deleted: '#d32f2f',
  }
  const color = colorMap[data.changeType] || '#333'

  const dateSection = data.start && data.end
    ? `<p style="margin:8px 0;color:#555;">📅 <strong>日時:</strong> ${data.start} 〜 ${data.end}</p>`
    : ''

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="font-family:'Hiragino Sans','Yu Gothic',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <div style="background:#1a1a2e;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
    <h2 style="margin:0;font-size:16px;">ミエルボード for 現場</h2>
  </div>
  <div style="border:1px solid #e0e0e0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 16px;">
      <span style="display:inline-block;padding:4px 12px;border-radius:4px;background:${color};color:#fff;font-size:13px;font-weight:600;">
        ${label}
      </span>
    </p>
    <p style="margin:8px 0;font-size:15px;">
      <strong>${data.changedBy}</strong> さんがスケジュールを${label}しました。
    </p>
    <div style="background:#f5f7fa;padding:16px;border-radius:6px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:600;font-size:15px;">📋 ${data.scheduleTitle}</p>
      ${dateSection}
    </div>
    <a href="${data.boardUrl}" style="display:inline-block;padding:10px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin-top:8px;">
      週間ボードで確認
    </a>
  </div>
  <p style="margin-top:24px;font-size:12px;color:#999;text-align:center;">
    このメールは ${data.orgName} の ミエルボード for 現場 から自動送信されています。
  </p>
</body>
</html>`.trim()
}
