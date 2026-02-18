/**
 * パフォーマンス測定ユーティリティ
 * APIレスポンス時間を測定し、構造化されたメトリクスとして出力する
 */

export interface PerformanceMetrics {
  endpoint: string
  method: string
  duration: number      // ミリ秒
  timestamp: string     // ISO 8601
  organizationId?: string
}

interface MeasureMetadata {
  endpoint: string
  method: string
  organizationId?: string
}

/**
 * API呼び出しのパフォーマンスを測定する
 * @param fn 測定対象の非同期関数
 * @param metadata エンドポイント情報
 * @returns 実行結果とパフォーマンスメトリクス
 */
export async function measureApiPerformance<T>(
  fn: () => Promise<T>,
  metadata: MeasureMetadata
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const startTime = performance.now()
  const timestamp = new Date().toISOString()

  const result = await fn()

  const endTime = performance.now()
  const duration = Math.round(endTime - startTime)

  const metrics: PerformanceMetrics = {
    endpoint: metadata.endpoint,
    method: metadata.method,
    duration,
    timestamp,
    ...(metadata.organizationId && { organizationId: metadata.organizationId })
  }

  return { result, metrics }
}

/**
 * パフォーマンスメトリクスをJSON形式でログ出力する
 * @param metrics パフォーマンスメトリクス
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  // eslint-disable-next-line no-console
  console.info(JSON.stringify({ type: 'performance', metrics }))
}
