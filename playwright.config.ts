import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:6001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // ローカル開発サーバー（CI ではすでに起動済み想定）
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:6001',
    reuseExistingServer: true,
    timeout: 60000,
  },
  // 出力先
  outputDir: 'tests/e2e/artifacts',
})
