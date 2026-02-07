<template>
  <div class="admin-billing-page">
    <div class="admin-page">
      <div class="page-header">
        <h1>課金管理</h1>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

      <!-- サブスクリプション情報 -->
      <section class="billing-section">
        <h2>現在のプラン</h2>

        <div v-if="loading" class="loading">読み込み中...</div>

        <div v-else-if="!subscriptionData?.subscription" class="no-plan">
          <p>プランが設定されていません。</p>
          <div class="plan-cards">
            <div
              v-for="plan in availablePlans"
              :key="plan.type"
              class="plan-card"
              :class="{ recommended: plan.recommended }"
            >
              <div v-if="plan.recommended" class="recommended-badge">推奨</div>
              <h3>{{ plan.name }}</h3>
              <div class="plan-price">
                <span class="price">¥{{ plan.monthlyPrice.toLocaleString() }}</span>
                <span class="period">/月（税抜）</span>
              </div>
              <ul class="plan-features">
                <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
              </ul>
              <button
                class="btn btn-primary"
                :disabled="subscribing"
                @click="subscribe(plan.type)"
              >
                14日間無料で試す
              </button>
            </div>
          </div>
        </div>

        <div v-else class="current-plan">
          <div class="plan-info-grid">
            <div class="plan-info-item">
              <span class="label">プラン</span>
              <span class="value plan-name">{{ planDisplayName }}</span>
            </div>
            <div class="plan-info-item">
              <span class="label">ステータス</span>
              <span class="value" :class="'status-' + subscriptionData.subscription.status.toLowerCase()">
                {{ statusDisplayName }}
              </span>
            </div>
            <div class="plan-info-item">
              <span class="label">課金サイクル</span>
              <span class="value">{{ subscriptionData.subscription.billingInterval === 'year' ? '年払い' : '月払い' }}</span>
            </div>
            <div class="plan-info-item">
              <span class="label">ユーザー上限</span>
              <span class="value">{{ subscriptionData.subscription.maxUsers }}名</span>
            </div>
            <div class="plan-info-item">
              <span class="label">次回更新日</span>
              <span class="value">{{ formatDate(subscriptionData.subscription.currentPeriodEnd) }}</span>
            </div>
            <div v-if="subscriptionData.subscription.trialEndsAt" class="plan-info-item">
              <span class="label">トライアル終了</span>
              <span class="value">{{ formatDate(subscriptionData.subscription.trialEndsAt) }}</span>
            </div>
          </div>

          <div class="plan-actions">
            <button class="btn btn-secondary" @click="openPortal" :disabled="subscribing">
              カード変更 / プラン変更 / 解約
            </button>
          </div>
        </div>
      </section>

      <!-- AI クレジット -->
      <section class="billing-section">
        <h2>AI クレジット</h2>

        <div v-if="subscriptionData?.credits" class="credits-overview">
          <div class="credits-balance">
            <div class="credits-number">
              <span v-if="subscriptionData.credits.isUnlimited" class="unlimited">無制限</span>
              <span v-else>{{ subscriptionData.credits.balance }}</span>
            </div>
            <div class="credits-label">残りクレジット</div>
            <div v-if="!subscriptionData.credits.isUnlimited" class="credits-detail">
              月次付与: {{ subscriptionData.credits.monthlyGrant }}回
              <span v-if="subscriptionData.credits.packCredits > 0">
                / パック: {{ subscriptionData.credits.packCredits }}回
              </span>
            </div>
          </div>

          <!-- 追加パック購入 -->
          <div v-if="!subscriptionData.credits.isUnlimited && subscriptionData?.subscription" class="credit-packs">
            <h3>追加パック</h3>
            <div class="pack-cards">
              <div v-for="pack in creditPacks" :key="pack.name" class="pack-card">
                <h4>{{ pack.name }}</h4>
                <div class="pack-credits">+{{ pack.credits }}回/月</div>
                <div class="pack-price">¥{{ pack.price.toLocaleString() }}/月</div>
                <button
                  class="btn btn-sm btn-primary"
                  :disabled="subscribing"
                  @click="purchasePack(pack.priceKey)"
                >
                  購入
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 使用履歴 -->
        <div v-if="creditHistory.length > 0" class="credit-history">
          <h3>使用履歴（直近）</h3>
          <table class="history-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>種別</th>
                <th>数量</th>
                <th>残高</th>
                <th>説明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in creditHistory" :key="tx.id">
                <td>{{ formatDateTime(tx.createdAt) }}</td>
                <td>
                  <span class="tx-type" :class="tx.type.toLowerCase()">
                    {{ txTypeLabel(tx.type) }}
                  </span>
                </td>
                <td :class="tx.amount > 0 ? 'positive' : 'negative'">
                  {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
                </td>
                <td>{{ tx.balanceAfter === -1 ? '∞' : tx.balanceAfter }}</td>
                <td>{{ tx.description || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const error = ref('')
const successMessage = ref('')
const loading = ref(true)
const subscribing = ref(false)

// URL パラメータチェック
const route = useRoute()
if (route.query.success === 'true') {
  successMessage.value = 'プランの契約が完了しました！'
}
if (route.query.credits_purchased === 'true') {
  successMessage.value = 'クレジットパックの購入が完了しました！'
}

// プラン定義を API から取得
import { usePricingConfig, type PlanConfigResponse, type CreditPackConfigResponse } from '~/composables/usePricingConfig'
const { data: pricingConfig } = usePricingConfig()

// プラン表示用の型
interface AvailablePlan {
  type: string
  name: string
  monthlyPrice: number
  recommended: boolean
  features: string[]
  stripePriceId?: string | null
}

// 互換性のある形式でプランを提供
const availablePlans = computed<AvailablePlan[]>(() => {
  if (!pricingConfig.value?.plans?.length) {
    // フォールバック
    return [
      { type: 'STARTER', name: 'スターター', monthlyPrice: 14800, recommended: false, features: ['10名まで', '週間ボード', '部門フィルタ', 'リアルタイム更新'], stripePriceId: null },
      { type: 'BUSINESS', name: 'ビジネス', monthlyPrice: 39800, recommended: true, features: ['30名まで', '全機能', 'カレンダー連携', 'AI音声入力'], stripePriceId: null },
      { type: 'ENTERPRISE', name: 'エンタープライズ', monthlyPrice: 79800, recommended: false, features: ['100名まで', '全モジュール', 'AI無制限'], stripePriceId: null },
    ]
  }
  return pricingConfig.value.plans.map((plan: PlanConfigResponse) => ({
    type: plan.planType,
    name: plan.name,
    monthlyPrice: plan.monthlyPrice,
    recommended: plan.isRecommended,
    features: plan.featureLabels.length > 0 ? plan.featureLabels : plan.features,
    stripePriceId: plan.stripePriceIdMonthly,
  }))
})

const creditPacks = computed(() => {
  if (!pricingConfig.value?.creditPacks?.length) {
    // フォールバック
    return [
      { name: 'ライト', credits: 100, price: 1500, priceKey: 'ai_credit_pack_light' },
      { name: 'スタンダード', credits: 300, price: 3500, priceKey: 'ai_credit_pack_standard' },
      { name: 'プロ', credits: 1000, price: 9800, priceKey: 'ai_credit_pack_pro' },
    ]
  }
  return pricingConfig.value.creditPacks.map((pack: CreditPackConfigResponse) => ({
    name: pack.name,
    credits: pack.credits,
    price: pack.price,
    priceKey: pack.stripePriceId || `ai_credit_pack_${pack.name.toLowerCase()}`,
  }))
})

// データ取得
interface SubscriptionResponse {
  subscription: {
    planType: string
    status: string
    maxUsers: number
    monthlyAiCredits: number
    currentPeriodStart: string
    currentPeriodEnd: string
    trialEndsAt: string | null
    canceledAt: string | null
    billingInterval: string
  } | null
  credits: {
    balance: number
    monthlyGrant: number
    packCredits: number
    isUnlimited: boolean
    lastResetAt?: string
  }
}

interface CreditTransaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

const subscriptionData = ref<SubscriptionResponse | null>(null)
const creditHistory = ref<CreditTransaction[]>([])

async function fetchData() {
  loading.value = true
  try {
    const [subRes, creditsRes] = await Promise.all([
      $fetch<SubscriptionResponse>('/api/billing/subscription'),
      $fetch<{ balance: object; history: CreditTransaction[] }>('/api/billing/credits'),
    ])
    subscriptionData.value = subRes
    creditHistory.value = creditsRes.history
  } catch (e: unknown) {
    error.value = 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// 表示ヘルパー
const planDisplayName = computed(() => {
  const map: Record<string, string> = {
    STARTER: 'スターター',
    BUSINESS: 'ビジネス',
    ENTERPRISE: 'エンタープライズ',
  }
  return map[subscriptionData.value?.subscription?.planType || ''] || '不明'
})

const statusDisplayName = computed(() => {
  const map: Record<string, string> = {
    TRIALING: 'トライアル中',
    ACTIVE: '有効',
    PAST_DUE: '支払い遅延',
    CANCELED: '解約済み',
    UNPAID: '未払い',
  }
  return map[subscriptionData.value?.subscription?.status || ''] || '不明'
})

function txTypeLabel(type: string): string {
  const map: Record<string, string> = {
    MONTHLY_GRANT: '月次付与',
    USAGE: '使用',
    PACK_PURCHASE: 'パック購入',
    ADJUSTMENT: '調整',
    EXPIRE: '失効',
  }
  return map[type] || type
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP')
}

// アクション
async function subscribe(planType: string) {
  subscribing.value = true
  error.value = ''
  try {
    // PlanConfig から Stripe Price ID を取得
    const plan = availablePlans.value.find(p => p.type === planType)
    const priceId = plan?.stripePriceId || `placeholder_${planType.toLowerCase()}`

    const result = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      body: {
        priceId,
        billingInterval: 'month',
      },
    })
    if (result.url) {
      window.location.href = result.url
    }
  } catch (e: unknown) {
    error.value = 'チェックアウトの作成に失敗しました'
  } finally {
    subscribing.value = false
  }
}

async function openPortal() {
  subscribing.value = true
  error.value = ''
  try {
    const result = await $fetch<{ url: string }>('/api/billing/portal', {
      method: 'POST',
    })
    if (result.url) {
      window.location.href = result.url
    }
  } catch (e: unknown) {
    error.value = 'ポータルの作成に失敗しました'
  } finally {
    subscribing.value = false
  }
}

async function purchasePack(priceKey: string) {
  subscribing.value = true
  error.value = ''
  try {
    const result = await $fetch<{ url: string }>('/api/billing/credits/purchase', {
      method: 'POST',
      body: { packPriceId: `placeholder_${priceKey}` },
    })
    if (result.url) {
      window.location.href = result.url
    }
  } catch (e: unknown) {
    error.value = 'パック購入の作成に失敗しました'
  } finally {
    subscribing.value = false
  }
}
</script>

<style scoped>
.admin-billing-page {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.billing-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.billing-section h2 {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

/* プランカード */
.plan-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.plan-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: border-color 0.2s;
}

.plan-card:hover {
  border-color: #3b82f6;
}

.plan-card.recommended {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.recommended-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #3b82f6;
  color: #fff;
  padding: 2px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.plan-card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.plan-price {
  margin-bottom: 12px;
}

.plan-price .price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e40af;
}

.plan-price .period {
  font-size: 0.85rem;
  color: #6b7280;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}

.plan-features li {
  padding: 4px 0;
  font-size: 0.9rem;
  color: #374151;
}

.plan-features li::before {
  content: '✓ ';
  color: #16a34a;
}

/* 現在のプラン */
.plan-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.plan-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-info-item .label {
  font-size: 0.8rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.plan-info-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.plan-name {
  color: #1e40af !important;
}

.status-active, .status-trialing {
  color: #16a34a !important;
}

.status-past_due, .status-unpaid {
  color: #dc2626 !important;
}

.status-canceled {
  color: #6b7280 !important;
}

.plan-actions {
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

/* クレジット */
.credits-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.credits-balance {
  text-align: center;
  padding: 20px;
  background: #f0f9ff;
  border-radius: 12px;
}

.credits-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e40af;
}

.unlimited {
  font-size: 1.5rem;
  color: #16a34a;
}

.credits-label {
  font-size: 0.9rem;
  color: #6b7280;
  margin-top: 4px;
}

.credits-detail {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 4px;
}

/* パックカード */
.credit-packs h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.pack-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.pack-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.pack-card h4 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.pack-credits {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 4px;
}

.pack-price {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 12px;
}

/* 履歴テーブル */
.credit-history h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.history-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid #e5e7eb;
  color: #6b7280;
  font-weight: 600;
}

.history-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
}

.tx-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tx-type.monthly_grant { background: #dbeafe; color: #1e40af; }
.tx-type.usage { background: #fef3c7; color: #92400e; }
.tx-type.pack_purchase { background: #d1fae5; color: #065f46; }
.tx-type.adjustment { background: #e5e7eb; color: #374151; }
.tx-type.expire { background: #fee2e2; color: #991b1b; }

.positive { color: #16a34a; font-weight: 600; }
.negative { color: #dc2626; font-weight: 600; }

/* 共通ボタン */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.no-plan p {
  color: #6b7280;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .plan-cards {
    grid-template-columns: 1fr;
  }
  .pack-cards {
    grid-template-columns: 1fr;
  }
  .plan-info-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
