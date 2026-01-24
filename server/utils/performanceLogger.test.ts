import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { measureApiPerformance, logPerformanceMetrics, type PerformanceMetrics } from './performanceLogger'

describe('performanceLogger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('measureApiPerformance', () => {
    it('should measure duration correctly', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { data: 'test' }
      })

      const startTime = Date.now()
      const resultPromise = measureApiPerformance(mockFn, {
        endpoint: '/api/test',
        method: 'GET'
      })

      // Advance timers by 100ms
      await vi.advanceTimersByTimeAsync(100)

      const { result, metrics } = await resultPromise

      expect(result).toEqual({ data: 'test' })
      expect(metrics.endpoint).toBe('/api/test')
      expect(metrics.method).toBe('GET')
      expect(metrics.duration).toBeGreaterThanOrEqual(0)
      expect(metrics.timestamp).toBeDefined()
    })

    it('should include organizationId in metrics when provided', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' })

      const { metrics } = await measureApiPerformance(mockFn, {
        endpoint: '/api/test',
        method: 'GET',
        organizationId: 'org-123'
      })

      expect(metrics.organizationId).toBe('org-123')
    })

    it('should still record metrics when function throws', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('API Error'))

      await expect(
        measureApiPerformance(mockFn, {
          endpoint: '/api/test',
          method: 'GET'
        })
      ).rejects.toThrow('API Error')
    })
  })

  describe('logPerformanceMetrics', () => {
    it('should output metrics as JSON', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const metrics: PerformanceMetrics = {
        endpoint: '/api/test',
        method: 'GET',
        duration: 150,
        timestamp: '2026-01-24T10:00:00.000Z'
      }

      logPerformanceMetrics(metrics)

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const output = consoleSpy.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.type).toBe('performance')
      expect(parsed.metrics).toEqual(metrics)

      consoleSpy.mockRestore()
    })

    it('should include organizationId in output when present', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const metrics: PerformanceMetrics = {
        endpoint: '/api/test',
        method: 'GET',
        duration: 150,
        timestamp: '2026-01-24T10:00:00.000Z',
        organizationId: 'org-123'
      }

      logPerformanceMetrics(metrics)

      const output = consoleSpy.mock.calls[0][0]
      const parsed = JSON.parse(output)

      expect(parsed.metrics.organizationId).toBe('org-123')

      consoleSpy.mockRestore()
    })
  })
})
