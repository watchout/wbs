/**
 * Stripe Webhook Integration Tests
 *
 * テスト対象: POST /api/billing/webhook
 *
 * Stripe 署名検証 → イベントタイプ別ハンドリングの統合テスト
 * 金銭処理に直結するため、全分岐を網羅する
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ================================================================
// モック定義（vi.hoisted で変数を事前に定義）
// ================================================================

const {
  mockPrisma,
  mockStripe,
  mockAiCredits,
  mockEnv,
} = vi.hoisted(() => ({
  mockPrisma: {
    subscription: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockStripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
    products: { retrieve: vi.fn() },
    prices: { retrieve: vi.fn() },
  },
  mockAiCredits: {
    resetMonthlyCredits: vi.fn(),
    initializeCredits: vi.fn(),
    grantPackCredits: vi.fn(),
  },
  mockEnv: {
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
}))

// モック登録
vi.mock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
vi.mock('~/server/utils/stripe', () => ({
  stripe: mockStripe,
  PLAN_LIMITS: {
    STARTER: { maxUsers: 10, monthlyAiCredits: 150, features: ['board'] },
    BUSINESS: { maxUsers: 30, monthlyAiCredits: 400, features: ['board', 'calendar', 'signage'] },
    ENTERPRISE: { maxUsers: -1, monthlyAiCredits: -1, features: ['board', 'calendar', 'signage', 'api'] },
  },
}))
vi.mock('~/server/utils/aiCredits', () => mockAiCredits)
vi.mock('~/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// h3 モック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readRawBody: (event: { _rawBody: unknown }) => Promise.resolve(event._rawBody),
    getHeader: (_event: unknown, name: string) => {
      const headers = (_event as { _headers?: Record<string, string> })._headers || {}
      return headers[name]
    },
  }
})

// ================================================================
// ヘルパー
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockEvent(overrides: {
  rawBody?: string
  headers?: Record<string, string>
}): any {
  return {
    node: {
      req: {
        headers: overrides.headers || {},
        url: '/api/billing/webhook',
        method: 'POST',
        socket: { remoteAddress: '127.0.0.1' },
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
      },
    },
    context: {},
    _rawBody: overrides.rawBody,
    _headers: overrides.headers,
  }
}

/**
 * Stripe.Event オブジェクトの簡易ファクトリ
 */
function createStripeEvent(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataObject: Record<string, any>
) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event' as const,
    type,
    data: {
      object: dataObject,
    },
    api_version: '2025-01-27.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  }
}

/**
 * Stripe.Subscription のモックファクトリ
 */
function createMockSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_test_123',
    status: 'active',
    metadata: { organizationId: 'org-1' },
    items: {
      data: [{
        price: {
          id: 'price_test_123',
          product: 'prod_test_123',
          recurring: { interval: 'month' },
        },
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      }],
    },
    trial_end: null,
    canceled_at: null,
    ...overrides,
  }
}

// ================================================================
// テスト
// ================================================================

describe('POST /api/billing/webhook', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // 環境変数を設定
    process.env.STRIPE_WEBHOOK_SECRET = mockEnv.STRIPE_WEBHOOK_SECRET
    // モジュールをリセットして再インポート（環境変数の変更を反映）
    vi.resetModules()
    // モック再登録
    vi.doMock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
    vi.doMock('~/server/utils/stripe', () => ({
      stripe: mockStripe,
      PLAN_LIMITS: {
        STARTER: { maxUsers: 10, monthlyAiCredits: 150, features: ['board'] },
        BUSINESS: { maxUsers: 30, monthlyAiCredits: 400, features: ['board', 'calendar', 'signage'] },
        ENTERPRISE: { maxUsers: -1, monthlyAiCredits: -1, features: ['board', 'calendar', 'signage', 'api'] },
      },
    }))
    vi.doMock('~/server/utils/aiCredits', () => mockAiCredits)
    vi.doMock('~/server/utils/logger', () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
    }))
    vi.doMock('h3', async () => {
      const actual = await vi.importActual('h3')
      return {
        ...actual,
        readRawBody: (event: { _rawBody: unknown }) => Promise.resolve(event._rawBody),
        getHeader: (_event: unknown, name: string) => {
          const headers = (_event as { _headers?: Record<string, string> })._headers || {}
          return headers[name]
        },
      }
    })
    const mod = await import('./webhook.post')
    handler = mod.default
  })

  // ----------------------------------------------------------
  // 署名検証・バリデーション
  // ----------------------------------------------------------
  describe('署名検証・バリデーション', () => {
    it('リクエストボディが空の場合 400 を返す', async () => {
      const event = createMockEvent({
        rawBody: undefined,
        headers: { 'stripe-signature': 'sig_test' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('stripe-signature ヘッダーが未設定の場合 400 を返す', async () => {
      const event = createMockEvent({
        rawBody: '{"type":"test"}',
        headers: {},
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('STRIPE_WEBHOOK_SECRET 環境変数が未設定の場合 500 を返す', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      // 環境変数変更後にモジュール再インポート
      vi.resetModules()
      vi.doMock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
      vi.doMock('~/server/utils/stripe', () => ({
        stripe: mockStripe,
        PLAN_LIMITS: {
          STARTER: { maxUsers: 10, monthlyAiCredits: 150, features: ['board'] },
          BUSINESS: { maxUsers: 30, monthlyAiCredits: 400, features: ['board', 'calendar', 'signage'] },
          ENTERPRISE: { maxUsers: -1, monthlyAiCredits: -1, features: ['board', 'calendar', 'signage', 'api'] },
        },
      }))
      vi.doMock('~/server/utils/aiCredits', () => mockAiCredits)
      vi.doMock('~/server/utils/logger', () => ({
        createLogger: () => ({
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        }),
      }))
      vi.doMock('h3', async () => {
        const actual = await vi.importActual('h3')
        return {
          ...actual,
          readRawBody: (event: { _rawBody: unknown }) => Promise.resolve(event._rawBody),
          getHeader: (_event: unknown, name: string) => {
            const headers = (_event as { _headers?: Record<string, string> })._headers || {}
            return headers[name]
          },
        }
      })
      const mod = await import('./webhook.post')
      const freshHandler = mod.default

      const event = createMockEvent({
        rawBody: '{"type":"test"}',
        headers: { 'stripe-signature': 'sig_test' },
      })

      await expect(freshHandler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })

    it('署名検証失敗（constructEvent が例外）の場合 400 を返す', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed')
      })

      const event = createMockEvent({
        rawBody: '{"type":"test"}',
        headers: { 'stripe-signature': 'sig_invalid' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  // ----------------------------------------------------------
  // checkout.session.completed
  // ----------------------------------------------------------
  describe('checkout.session.completed', () => {
    it('サブスクリプション契約完了時に syncSubscription が呼ばれる', async () => {
      const mockSub = createMockSubscription()
      const stripeEvent = createStripeEvent('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_test_123',
        metadata: { organizationId: 'org-1' },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSub)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'ビジネスプラン',
        metadata: { planType: 'BUSINESS' },
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"checkout.session.completed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      // syncSubscription が実行されたことを検証
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123')
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          create: expect.objectContaining({
            organizationId: 'org-1',
            planType: 'BUSINESS',
          }),
          update: expect.objectContaining({
            planType: 'BUSINESS',
          }),
        })
      )
      expect(mockAiCredits.initializeCredits).toHaveBeenCalledWith('org-1', 400)
      expect(result).toEqual({ received: true })
    })

    it('credit_pack タイプの場合はスキップする', async () => {
      const stripeEvent = createStripeEvent('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_test_123',
        metadata: { organizationId: 'org-1', type: 'credit_pack' },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      const event = createMockEvent({
        rawBody: '{"type":"checkout.session.completed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      // subscriptions.retrieve が呼ばれないことを確認（スキップ）
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })

    it('metadata に organizationId がない場合はスキップする', async () => {
      const stripeEvent = createStripeEvent('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_test_123',
        metadata: {},
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      const event = createMockEvent({
        rawBody: '{"type":"checkout.session.completed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      // subscriptions.retrieve が呼ばれないことを確認
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })

    it('mode が subscription でない場合はスキップする', async () => {
      const stripeEvent = createStripeEvent('checkout.session.completed', {
        mode: 'payment',
        subscription: null,
        metadata: { organizationId: 'org-1' },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      const event = createMockEvent({
        rawBody: '{"type":"checkout.session.completed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })
  })

  // ----------------------------------------------------------
  // customer.subscription.updated
  // ----------------------------------------------------------
  describe('customer.subscription.updated', () => {
    it('metadata に organizationId がある場合 syncSubscription が呼ばれる', async () => {
      const mockSub = createMockSubscription()
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSub)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'ビジネスプラン',
        metadata: { planType: 'BUSINESS' },
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
        })
      )
      expect(result).toEqual({ received: true })
    })

    it('metadata がない場合、DB から organizationId を検索して sync する', async () => {
      const mockSubWithoutMeta = createMockSubscription({
        metadata: {}, // organizationId なし
      })
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSubWithoutMeta)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      // DB に既存レコードがある
      mockPrisma.subscription.findUnique.mockResolvedValue({
        organizationId: 'org-from-db',
        stripeSubscriptionId: 'sub_test_123',
      })
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'ビジネスプラン',
        metadata: { planType: 'BUSINESS' },
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      // DB から検索されたことを確認
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_test_123' },
      })
      // DB から取得した organizationId で sync されることを確認
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-from-db' },
        })
      )
      expect(result).toEqual({ received: true })
    })

    it('metadata がなく DB にもレコードがない場合はスキップ', async () => {
      const mockSubWithoutMeta = createMockSubscription({
        metadata: {},
      })
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSubWithoutMeta)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })
  })

  // ----------------------------------------------------------
  // customer.subscription.deleted
  // ----------------------------------------------------------
  describe('customer.subscription.deleted', () => {
    it('サブスクリプションのステータスを CANCELED に更新する', async () => {
      const stripeEvent = createStripeEvent('customer.subscription.deleted', {
        id: 'sub_canceled_123',
        metadata: {},
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 })

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.deleted"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_canceled_123' },
        data: {
          status: 'CANCELED',
          canceledAt: expect.any(Date),
        },
      })
      expect(result).toEqual({ received: true })
    })
  })

  // ----------------------------------------------------------
  // invoice.paid
  // ----------------------------------------------------------
  describe('invoice.paid', () => {
    it('月次支払い成功時に resetMonthlyCredits が呼ばれる', async () => {
      const stripeEvent = createStripeEvent('invoice.paid', {
        id: 'inv_test_123',
        parent: {
          subscription_details: {
            subscription: 'sub_test_123',
          },
        },
        lines: { data: [] },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.findUnique.mockResolvedValue({
        organizationId: 'org-1',
        stripeSubscriptionId: 'sub_test_123',
      })
      mockAiCredits.resetMonthlyCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"invoice.paid"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockAiCredits.resetMonthlyCredits).toHaveBeenCalledWith('org-1')
      expect(result).toEqual({ received: true })
    })

    it('クレジットパック購入の場合 grantPackCredits が呼ばれる', async () => {
      const stripeEvent = createStripeEvent('invoice.paid', {
        id: 'inv_pack_123',
        parent: {
          subscription_details: {
            subscription: 'sub_test_123',
          },
        },
        lines: {
          data: [{
            pricing: {
              price_details: {
                price: 'price_pack_100',
              },
            },
          }],
        },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.findUnique.mockResolvedValue({
        organizationId: 'org-1',
        stripeSubscriptionId: 'sub_test_123',
      })
      // price → product → metadata.credits の検索チェーン
      mockStripe.prices.retrieve.mockResolvedValue({
        id: 'price_pack_100',
        product: 'prod_pack_100',
      })
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_pack_100',
        name: '100クレジットパック',
        metadata: { credits: '100' },
      })
      mockAiCredits.grantPackCredits.mockResolvedValue(undefined)
      mockAiCredits.resetMonthlyCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"invoice.paid"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      // grantPackCredits が正しいパラメータで呼ばれることを確認
      expect(mockAiCredits.grantPackCredits).toHaveBeenCalledWith(
        'org-1',
        100,
        '100クレジットパック',
        'inv_pack_123',
      )
      // 通常の月次リセットも実行されることを確認
      expect(mockAiCredits.resetMonthlyCredits).toHaveBeenCalledWith('org-1')
      expect(result).toEqual({ received: true })
    })

    it('subscription 参照がオブジェクト形式の場合も正しく処理する', async () => {
      const stripeEvent = createStripeEvent('invoice.paid', {
        id: 'inv_test_456',
        parent: {
          subscription_details: {
            subscription: { id: 'sub_obj_123' }, // オブジェクト形式
          },
        },
        lines: { data: [] },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.findUnique.mockResolvedValue({
        organizationId: 'org-2',
        stripeSubscriptionId: 'sub_obj_123',
      })
      mockAiCredits.resetMonthlyCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"invoice.paid"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_obj_123' },
      })
      expect(mockAiCredits.resetMonthlyCredits).toHaveBeenCalledWith('org-2')
      expect(result).toEqual({ received: true })
    })

    it('subscription 参照がない場合はスキップする', async () => {
      const stripeEvent = createStripeEvent('invoice.paid', {
        id: 'inv_no_sub',
        parent: null,
        lines: { data: [] },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      const event = createMockEvent({
        rawBody: '{"type":"invoice.paid"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled()
      expect(mockAiCredits.resetMonthlyCredits).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })

    it('DB にサブスクリプションが存在しない場合はスキップする', async () => {
      const stripeEvent = createStripeEvent('invoice.paid', {
        id: 'inv_orphan',
        parent: {
          subscription_details: {
            subscription: 'sub_nonexistent',
          },
        },
        lines: { data: [] },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.findUnique.mockResolvedValue(null)

      const event = createMockEvent({
        rawBody: '{"type":"invoice.paid"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockAiCredits.resetMonthlyCredits).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })
  })

  // ----------------------------------------------------------
  // invoice.payment_failed
  // ----------------------------------------------------------
  describe('invoice.payment_failed', () => {
    it('支払い失敗時にステータスを PAST_DUE に更新する', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_failed', {
        id: 'inv_failed_123',
        parent: {
          subscription_details: {
            subscription: 'sub_failed_123',
          },
        },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 })

      const event = createMockEvent({
        rawBody: '{"type":"invoice.payment_failed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_failed_123' },
        data: { status: 'PAST_DUE' },
      })
      expect(result).toEqual({ received: true })
    })

    it('subscription 参照がオブジェクト形式の場合も正しく処理する', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_failed', {
        id: 'inv_failed_456',
        parent: {
          subscription_details: {
            subscription: { id: 'sub_failed_obj' },
          },
        },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 })

      const event = createMockEvent({
        rawBody: '{"type":"invoice.payment_failed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_failed_obj' },
        data: { status: 'PAST_DUE' },
      })
      expect(result).toEqual({ received: true })
    })

    it('subscription 参照がない場合はスキップする', async () => {
      const stripeEvent = createStripeEvent('invoice.payment_failed', {
        id: 'inv_failed_no_sub',
        parent: null,
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      const event = createMockEvent({
        rawBody: '{"type":"invoice.payment_failed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })
  })

  // ----------------------------------------------------------
  // 未処理イベント
  // ----------------------------------------------------------
  describe('未処理イベントタイプ', () => {
    it('未対応のイベントタイプでも received: true を返す', async () => {
      const stripeEvent = createStripeEvent('customer.created', {
        id: 'cus_new_123',
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)

      const event = createMockEvent({
        rawBody: '{"type":"customer.created"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      expect(result).toEqual({ received: true })
    })
  })

  // ----------------------------------------------------------
  // ハンドラー内エラー
  // ----------------------------------------------------------
  describe('ハンドラー内エラー', () => {
    it('イベント処理中にエラーが発生した場合 500 を返す', async () => {
      const mockSub = createMockSubscription()
      const stripeEvent = createStripeEvent('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_test_error',
        metadata: { organizationId: 'org-error' },
      })

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      // subscriptions.retrieve でエラーを発生させる
      mockStripe.subscriptions.retrieve.mockRejectedValue(
        new Error('Stripe API error')
      )

      const event = createMockEvent({
        rawBody: '{"type":"checkout.session.completed"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  // ----------------------------------------------------------
  // syncSubscription ヘルパーの追加テスト
  // ----------------------------------------------------------
  describe('syncSubscription ヘルパー', () => {
    it('プランタイプを product metadata から検出する', async () => {
      const mockSub = createMockSubscription()
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSub)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'Enterprise Plan',
        metadata: { planType: 'ENTERPRISE' },
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      await handler(event)

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            planType: 'ENTERPRISE',
            maxUsers: -1,
            monthlyAiCredits: -1,
          }),
        })
      )
    })

    it('product metadata にプランタイプがない場合、名前からフォールバック検出する', async () => {
      const mockSub = createMockSubscription()
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSub)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'スターター',
        metadata: {}, // planType なし
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      await handler(event)

      // 名前から STARTER と判定されることを確認
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            planType: 'STARTER',
          }),
        })
      )
    })

    it('Stripe ステータス mapping が正しい（trialing → TRIALING）', async () => {
      const mockSub = createMockSubscription({ status: 'trialing' })
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSub)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'ビジネスプラン',
        metadata: { planType: 'BUSINESS' },
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      await handler(event)

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: 'TRIALING',
          }),
        })
      )
    })

    it('trial_end と canceled_at が正しく Date に変換される', async () => {
      const trialEnd = 1700100000
      const canceledAt = 1700200000
      const mockSub = createMockSubscription({
        trial_end: trialEnd,
        canceled_at: canceledAt,
      })
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSub)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: 'ビジネスプラン',
        metadata: { planType: 'BUSINESS' },
      })
      mockPrisma.subscription.upsert.mockResolvedValue({})
      mockAiCredits.initializeCredits.mockResolvedValue(undefined)

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      await handler(event)

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            trialEndsAt: new Date(trialEnd * 1000),
            canceledAt: new Date(canceledAt * 1000),
          }),
        })
      )
    })

    it('クレジットパック商品（metadata.credits あり）はサブスクリプション同期をスキップ', async () => {
      const mockSub = createMockSubscription()
      const stripeEvent = createStripeEvent('customer.subscription.updated', mockSub)

      mockStripe.webhooks.constructEvent.mockReturnValue(stripeEvent)
      mockStripe.products.retrieve.mockResolvedValue({
        id: 'prod_test_123',
        name: '100クレジットパック',
        metadata: { credits: '100' }, // クレジットパック商品
      })

      const event = createMockEvent({
        rawBody: '{"type":"customer.subscription.updated"}',
        headers: { 'stripe-signature': 'sig_valid' },
      })

      const result = await handler(event)

      // upsert が呼ばれないことを確認（クレジットパックはスキップ）
      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled()
      expect(result).toEqual({ received: true })
    })
  })
})
