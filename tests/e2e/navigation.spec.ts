/**
 * E2E: ナビゲーション・レスポンシブ
 *
 * テスト対象:
 * - ヘッダーナビゲーション表示
 * - モバイルハンバーガーメニュー（NAV-005）
 * - レスポンシブ対応
 */
import { test, expect } from '@playwright/test'

test.describe('ナビゲーション', () => {
  test('ヘッダーが表示される', async ({ page }) => {
    await page.goto('/')

    const header = page.locator('.app-header')
    await expect(header).toBeVisible()

    // ブランドアイコン
    await expect(page.locator('.brand-icon')).toContainText('M')

    await page.screenshot({ path: 'tests/e2e/artifacts/header-desktop.png' })
  })

  test('ログインリンクが未認証時に表示される', async ({ page }) => {
    await page.goto('/')

    const loginLink = page.locator('.login-link')
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toContainText('ログイン')
  })

  test('ランディングページが表示される', async ({ page }) => {
    await page.goto('/')

    // ページの基本要素を確認
    await expect(page).toHaveURL('/')

    await page.screenshot({ path: 'tests/e2e/artifacts/landing-page.png' })
  })
})

test.describe('モバイルナビゲーション（NAV-005）', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X

  test('モバイルでハンバーガーメニューが非認証時は非表示', async ({ page }) => {
    await page.goto('/')

    // 未認証時はハンバーガーメニューは表示されない（ログインリンクのみ）
    const loginLink = page.locator('.login-link')
    await expect(loginLink).toBeVisible()

    // デスクトップナビは非表示
    const mainNav = page.locator('.main-nav')
    await expect(mainNav).not.toBeVisible()

    await page.screenshot({ path: 'tests/e2e/artifacts/mobile-header.png' })
  })

  test('モバイルでブランドテキストが非表示', async ({ page }) => {
    await page.goto('/')

    // ブランドテキストは768px以下で非表示
    const brandText = page.locator('.brand-text')
    await expect(brandText).not.toBeVisible()

    // ブランドアイコンは常に表示
    const brandIcon = page.locator('.brand-icon')
    await expect(brandIcon).toBeVisible()
  })
})

test.describe('レスポンシブ確認', () => {
  test('デスクトップ幅でのレイアウト', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')

    // ブランドテキストが表示される
    await expect(page.locator('.brand-text')).toBeVisible()

    await page.screenshot({ path: 'tests/e2e/artifacts/desktop-layout.png' })
  })

  test('タブレット幅でのレイアウト', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    await page.screenshot({ path: 'tests/e2e/artifacts/tablet-layout.png' })
  })

  test('モバイル幅でのレイアウト', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')

    await page.screenshot({ path: 'tests/e2e/artifacts/mobile-layout.png' })
  })
})
