#!/usr/bin/env npx tsx
/**
 * API パフォーマンス測定スクリプト
 *
 * 主要APIエンドポイントのレスポンス時間を測定し、
 * 統計情報をJSON形式で出力する。
 *
 * 使用方法:
 *   npm run perf:api
 *   npx tsx scripts/perf-api.ts
 */

interface EndpointConfig {
  name: string
  path: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
}

interface MeasurementResult {
  endpoint: string
  runs: number
  avg: number
  min: number
  max: number
  measurements: number[]
}

const ENDPOINTS: EndpointConfig[] = [
  { name: 'weekly-board', path: '/api/schedules/weekly-board', method: 'GET' },
  { name: 'departments', path: '/api/departments', method: 'GET' },
  { name: 'auth-me', path: '/api/auth/me', method: 'GET' }
]

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const RUNS_PER_ENDPOINT = 5

async function measureEndpoint(config: EndpointConfig): Promise<MeasurementResult> {
  const measurements: number[] = []

  for (let i = 0; i < RUNS_PER_ENDPOINT; i++) {
    const startTime = performance.now()

    try {
      const response = await fetch(`${BASE_URL}${config.path}`, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      })

      // レスポンスボディを読み取る（実際のレスポンス時間を計測）
      await response.text()
    } catch {
      // エラーでも時間は計測
    }

    const endTime = performance.now()
    measurements.push(Math.round(endTime - startTime))
  }

  const sum = measurements.reduce((a, b) => a + b, 0)
  const avg = Math.round(sum / measurements.length)
  const min = Math.min(...measurements)
  const max = Math.max(...measurements)

  return {
    endpoint: config.path,
    runs: RUNS_PER_ENDPOINT,
    avg,
    min,
    max,
    measurements
  }
}

async function runPerformanceTest() {
  const results: MeasurementResult[] = []

  console.error(`\n🚀 API パフォーマンス測定開始`)
  console.error(`   対象: ${BASE_URL}`)
  console.error(`   測定回数: 各エンドポイント ${RUNS_PER_ENDPOINT} 回\n`)

  for (const endpoint of ENDPOINTS) {
    console.error(`📊 測定中: ${endpoint.name} (${endpoint.path})...`)
    const result = await measureEndpoint(endpoint)
    results.push(result)
    console.error(`   → 平均: ${result.avg}ms (min: ${result.min}ms, max: ${result.max}ms)`)
  }

  // 結果をJSON形式で標準出力
  const output = {
    type: 'performance-report',
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    runsPerEndpoint: RUNS_PER_ENDPOINT,
    results
  }

  console.log(JSON.stringify(output, null, 2))

  console.error(`\n✅ 測定完了\n`)
}

runPerformanceTest().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
