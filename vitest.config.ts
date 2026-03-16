import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '@': resolve(__dirname, '.')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['node_modules/**', 'tests/e2e/**', '**/*.spec.ts'],
    // Optimization: parallel execution with optimal thread count
    threads: true,
    maxThreads: 4,
    minThreads: 2,
    // Increase timeout for slow crypto operations
    testTimeout: 15000,
    hookTimeout: 15000,
    // Isolate tests per thread to avoid state leaks
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'dist/',
        '.nuxt/',
        '.output/',
        'coverage/'
      ],
      all: false,
      lines: 15,
      functions: 15,
      branches: 10,
      statements: 15
    }
  }
})
