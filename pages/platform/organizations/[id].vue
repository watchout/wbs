<template>
  <div class="organization-detail">
    <div class="back-link">
      <NuxtLink to="/platform/organizations" class="back-btn">
        <span class="icon">arrow_back</span>
        契約一覧に戻る
      </NuxtLink>
    </div>

    <div v-if="loading" class="loading">読み込み中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div v-else class="detail-content">
      <!-- 組織情報 -->
      <section class="section">
        <h2>組織情報</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">組織名</span>
            <span class="value">{{ data?.organization.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">ID</span>
            <span class="value mono">{{ data?.organization.id }}</span>
          </div>
          <div class="info-item">
            <span class="label">タイムゾーン</span>
            <span class="value">{{ data?.organization.timezone }}</span>
          </div>
          <div class="info-item">
            <span class="label">Stripe Customer ID</span>
            <span class="value mono">{{ data?.organization.stripeCustomerId || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">作成日</span>
            <span class="value">{{ formatDate(data?.organization.createdAt) }}</span>
          </div>
        </div>
      </section>

      <!-- サブスクリプション -->
      <section class="section">
        <h2>サブスクリプション</h2>
        <div v-if="data?.subscription" class="info-grid">
          <div class="info-item">
            <span class="label">プラン</span>
            <span class="value">
              <span class="plan-badge" :class="data.subscription.planType.toLowerCase()">
                {{ planName(data.subscription.planType) }}
              </span>
            </span>
          </div>
          <div class="info-item">
            <span class="label">ステータス</span>
            <span class="value">
              <span class="status-badge" :class="data.subscription.status.toLowerCase()">
                {{ statusName(data.subscription.status) }}
              </span>
            </span>
          </div>
          <div class="info-item">
            <span class="label">課金サイクル</span>
            <span class="value">{{ data.subscription.billingInterval === 'year' ? '年払い' : '月払い' }}</span>
          </div>
          <div class="info-item">
            <span class="label">ユーザー上限</span>
            <span class="value">{{ data.subscription.maxUsers }}名</span>
          </div>
          <div class="info-item">
            <span class="label">月間AIクレジット</span>
            <span class="value">
              {{ data.subscription.monthlyAiCredits === -1 ? '無制限' : data.subscription.monthlyAiCredits + '回' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">現在の期間</span>
            <span class="value">
              {{ formatDate(data.subscription.currentPeriodStart) }} 〜 {{ formatDate(data.subscription.currentPeriodEnd) }}
            </span>
          </div>
          <div v-if="data.subscription.trialEndsAt" class="info-item">
            <span class="label">トライアル終了</span>
            <span class="value">{{ formatDate(data.subscription.trialEndsAt) }}</span>
          </div>
        </div>
        <div v-else class="no-data">サブスクリプションなし</div>
      </section>

      <!-- AIクレジット残高 -->
      <section class="section">
        <h2>AIクレジット</h2>
        <div v-if="data?.aiCreditBalance" class="info-grid">
          <div class="info-item">
            <span class="label">残高</span>
            <span class="value large">
              {{ data.aiCreditBalance.monthlyGrant === -1 ? '無制限' : data.aiCreditBalance.balance }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">月次付与</span>
            <span class="value">{{ data.aiCreditBalance.monthlyGrant === -1 ? '無制限' : data.aiCreditBalance.monthlyGrant + '回' }}</span>
          </div>
          <div class="info-item">
            <span class="label">追加パック分</span>
            <span class="value">{{ data.aiCreditBalance.packCredits }}回</span>
          </div>
        </div>
        <div v-else class="no-data">クレジット情報なし</div>
      </section>

      <!-- ユーザー一覧 -->
      <section class="section">
        <h2>ユーザー一覧（{{ data?.users.length }}名）</h2>
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>メールアドレス</th>
                <th>ロール</th>
                <th>部署</th>
                <th>作成日</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in data?.users" :key="user.id">
                <td>{{ user.name || '-' }}</td>
                <td class="mono">{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="user.role.toLowerCase()">{{ user.role }}</span>
                </td>
                <td>{{ user.department?.name || '-' }}</td>
                <td>{{ formatDate(user.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- クレジット利用履歴 -->
      <section class="section">
        <h2>クレジット利用履歴（直近50件）</h2>
        <div v-if="data?.recentTransactions && data.recentTransactions.length > 0" class="table-container">
          <table class="tx-table">
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
              <tr v-for="tx in data?.recentTransactions ?? []" :key="tx.id">
                <td>{{ formatDateTime(tx.createdAt) }}</td>
                <td>
                  <span class="tx-type" :class="tx.type.toLowerCase()">{{ txTypeName(tx.type) }}</span>
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
        <div v-else class="no-data">利用履歴なし</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'platform' as 'default',  // platform layout added - needs nuxt prepare
  middleware: 'platform-admin',
})

const route = useRoute()
const loading = ref(true)
const error = ref('')

interface OrganizationDetail {
  organization: {
    id: string
    name: string
    timezone: string
    stripeCustomerId: string | null
    createdAt: string
  }
  subscription: {
    planType: string
    status: string
    maxUsers: number
    monthlyAiCredits: number
    currentPeriodStart: string
    currentPeriodEnd: string
    trialEndsAt: string | null
    billingInterval: string
  } | null
  aiCreditBalance: {
    balance: number
    monthlyGrant: number
    packCredits: number
  } | null
  users: Array<{
    id: string
    email: string
    name: string | null
    role: string
    createdAt: string
    department: { id: string; name: string } | null
  }>
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    balanceAfter: number
    description: string | null
    createdAt: string
  }>
}

const data = ref<OrganizationDetail | null>(null)

async function fetchDetail() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch(`/api/platform/organizations/${route.params.id}`)
    data.value = res as OrganizationDetail
  } catch (e) {
    error.value = '組織情報の取得に失敗しました'
  } finally {
    loading.value = false
  }
}

function planName(planType: string): string {
  const names: Record<string, string> = {
    STARTER: 'スターター',
    BUSINESS: 'ビジネス',
    ENTERPRISE: 'エンタープライズ',
  }
  return names[planType] || planType
}

function statusName(status: string): string {
  const names: Record<string, string> = {
    TRIALING: 'トライアル中',
    ACTIVE: '有効',
    PAST_DUE: '支払い遅延',
    CANCELED: '解約済み',
    UNPAID: '未払い',
  }
  return names[status] || status
}

function txTypeName(type: string): string {
  const names: Record<string, string> = {
    MONTHLY_GRANT: '月次付与',
    USAGE: '使用',
    PACK_PURCHASE: 'パック購入',
    ADJUSTMENT: '調整',
    EXPIRE: '失効',
  }
  return names[type] || type
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP')
}

onMounted(fetchDetail)
</script>

<style scoped>
.organization-detail {
  max-width: 1200px;
}

.back-link {
  margin-bottom: 24px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.back-btn:hover {
  color: #3b82f6;
}

.back-btn .icon {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 18px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #64748b;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 0.8rem;
  color: #64748b;
}

.info-item .value {
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;
}

.info-item .value.large {
  font-size: 1.5rem;
  font-weight: 700;
}

.info-item .value.mono {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.85rem;
}

.plan-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.plan-badge.starter { background: #e2e8f0; color: #475569; }
.plan-badge.business { background: #dbeafe; color: #1d4ed8; }
.plan-badge.enterprise { background: #ede9fe; color: #6d28d9; }

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active { background: #dcfce7; color: #16a34a; }
.status-badge.trialing { background: #fef3c7; color: #d97706; }
.status-badge.past_due { background: #fee2e2; color: #dc2626; }
.status-badge.canceled { background: #f1f5f9; color: #64748b; }

.no-data {
  color: #94a3b8;
  font-size: 0.9rem;
}

.table-container {
  overflow-x: auto;
}

.users-table,
.tx-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.tx-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.users-table td,
.tx-table td {
  padding: 10px 12px;
  font-size: 0.85rem;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}

.users-table .mono,
.tx-table .mono {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.8rem;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.role-badge.admin { background: #dbeafe; color: #1d4ed8; }
.role-badge.leader { background: #dcfce7; color: #16a34a; }
.role-badge.member { background: #f1f5f9; color: #64748b; }
.role-badge.device { background: #fef3c7; color: #d97706; }

.tx-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.tx-type.monthly_grant { background: #dbeafe; color: #1d4ed8; }
.tx-type.usage { background: #fef3c7; color: #92400e; }
.tx-type.pack_purchase { background: #dcfce7; color: #16a34a; }
.tx-type.adjustment { background: #f1f5f9; color: #64748b; }
.tx-type.expire { background: #fee2e2; color: #dc2626; }

.positive { color: #16a34a; font-weight: 600; }
.negative { color: #dc2626; font-weight: 600; }
</style>
