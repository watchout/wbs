<template>
  <div class="platform-organizations">
    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="organizations-container">
      <div class="table-container">
        <table class="orgs-table">
          <thead>
            <tr>
              <th>組織名</th>
              <th>プラン</th>
              <th>ステータス</th>
              <th>ユーザー数</th>
              <th>AIクレジット残高</th>
              <th>作成日</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="org in organizations"
              :key="org.id"
              class="org-row"
              @click="goToDetail(org.id)"
            >
              <td class="org-name">{{ org.name }}</td>
              <td>
                <span
                  v-if="org.subscription"
                  class="plan-badge"
                  :class="org.subscription.planType.toLowerCase()"
                >
                  {{ planName(org.subscription.planType) }}
                </span>
                <span v-else class="plan-badge none">未契約</span>
              </td>
              <td>
                <span
                  v-if="org.subscription"
                  class="status-badge"
                  :class="org.subscription.status.toLowerCase()"
                >
                  {{ statusName(org.subscription.status) }}
                </span>
                <span v-else class="status-badge none">-</span>
              </td>
              <td>{{ org.userCount }}名</td>
              <td>
                <span v-if="org.aiCreditBalance">
                  {{ org.aiCreditBalance.monthlyGrant === -1 ? '無制限' : org.aiCreditBalance.balance }}
                </span>
                <span v-else>-</span>
              </td>
              <td>{{ formatDate(org.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="organizations.length === 0" class="empty-state">
        契約がまだありません
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'platform' as 'default',  // platform layout added - needs nuxt prepare
  middleware: 'platformAdmin' as 'auth',  // platformAdmin middleware added - needs nuxt prepare
})

const router = useRouter()
const loading = ref(true)

interface Organization {
  id: string
  name: string
  createdAt: string
  subscription: {
    planType: string
    status: string
  } | null
  userCount: number
  aiCreditBalance: {
    balance: number
    monthlyGrant: number
  } | null
}

const organizations = ref<Organization[]>([])

async function fetchOrganizations() {
  loading.value = true
  try {
    const res = await $fetch('/api/platform/organizations')
    organizations.value = (res as { organizations: Organization[] }).organizations
  } catch (e) {
    console.error('Failed to fetch organizations:', e)
  } finally {
    loading.value = false
  }
}

function goToDetail(id: string) {
  router.push(`/platform/organizations/${id}`)
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
    TRIALING: 'トライアル',
    ACTIVE: '有効',
    PAST_DUE: '支払い遅延',
    CANCELED: '解約済み',
    UNPAID: '未払い',
  }
  return names[status] || status
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

onMounted(fetchOrganizations)
</script>

<style scoped>
.platform-organizations {
  max-width: 1200px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #64748b;
}

.table-container {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.orgs-table {
  width: 100%;
  border-collapse: collapse;
}

.orgs-table th {
  text-align: left;
  padding: 14px 16px;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.orgs-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
  color: #1e293b;
}

.org-row {
  cursor: pointer;
  transition: background 0.2s;
}

.org-row:hover {
  background: #f8fafc;
}

.org-name {
  font-weight: 500;
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
.plan-badge.none { background: #f1f5f9; color: #94a3b8; }

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
.status-badge.unpaid { background: #fee2e2; color: #dc2626; }
.status-badge.none { background: #f1f5f9; color: #94a3b8; }

.empty-state {
  text-align: center;
  padding: 60px;
  color: #64748b;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
