/**
 * E2E: 認証フロー
 *
 * テスト対象:
 * - ログインページの表示
 * - ログイン → 週間ボードへリダイレクト
 * - 認証エラー表示
 * - ログアウト
 */
import { test, expect } from '@playwright/test'

test.describe('認証フロー', () => {
  test('ログインページが正しく表示される', async ({ page }) => {
    await page.goto('/login')

    // タイトル要素
    await expect(page.locator('h1')).toContainText('ミエルボード')

    // フォーム要素
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('ログイン')

    // スクリーンショット
    await page.screenshot({ path: 'tests/e2e/artifacts/login-page.png' })
  })

  test('空のフォーム送信で HTML5 バリデーションが効く', async ({ page }) => {
    await page.goto('/login')

    // email は required なので空のまま submit しても送信されない
    const emailInput = page.locator('#email')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('不正な認証情報でエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    // Hydration 完了を待つ
    const emailInput = page.locator('#email')
    const passwordInput = page.locator('#password')
    const submitButton = page.locator('button[type="submit"]')
    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await expect(submitButton).toBeEnabled()

    // クリックして入力フォーカスを確保してからtype
    await emailInput.click()
    await emailInput.fill('nonexistent@example.com')
    await passwordInput.click()
    await passwordInput.fill('wrongpassword')

    // submit
    await submitButton.click()

    // エラーメッセージの表示を待機
    // Vueがエラーをキャッチし .error-message を表示するまで待つ
    const errorMsg = page.locator('.error-message')
    await expect(errorMsg).toBeVisible({ timeout: 15000 })

    await page.screenshot({ path: 'tests/e2e/artifacts/login-error.png' })
  })

  test('ヘルスチェックAPIが正常に動作する', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(['healthy', 'degraded']).toContain(data.status)
    expect(data).toHaveProperty('timestamp')
  })
})
