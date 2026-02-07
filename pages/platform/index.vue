<template>
  <div class="platform-dashboard">
    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="dashboard-content">
      <!-- サマリーカード -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon blue">
            <span>business</span>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.totalOrganizations }}</div>
            <div class="card-label">総契約数</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon green">
            <span>check_circle</span>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.activeSubscriptions }}</div>
            <div class="card-label">アクティブ</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon yellow">
            <span>hourglass_empty</span>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.trialingSubscriptions }}</div>
            <div class="card-label">トライアル中</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon gray">
            <span>cancel</span>
          </div>
          <div class="card-content">
            <div class="card-value">{{ stats.canceledSubscriptions }}</div>
            <div class="card-label">解約済み</div>
          </div>
        </div>
      </div>

      <!-- ローンチ割引ステータス -->
      <div class="launch-status-card">
        <h3>ローンチ割引ステータス</h3>
        <div class="launch-content">
          <div class="launch-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${Math.min(100, (launchStatus.totalSlots - launchStatus.remaining) / launchStatus.totalSlots * 100)}%` }"
              ></div>
            </div>
            <div class="progress-label">
              {{ launchStatus.totalSlots - launchStatus.remaining }} / {{ launchStatus.totalSlots }} 枠使用済み
            </div>
          </div>

          <div class="launch-info">
            <div class="launch-stat">
              <span class="stat-value">{{ launchStatus.remaining }}</span>
              <span class="stat-label">残り枠</span>
            </div>
            <div class="launch-stat">
              <span class="stat-value">{{ launchStatus.currentDiscount }}%</span>
              <span class="stat-label">現在の割引率</span>
            </div>
            <div class="launch-stat">
              <span class="stat-value" :class="launchStatus.isLaunchPhase ? 'active' : 'inactive'">
                {{ launchStatus.isLaunchPhase ? '実施中' : '終了' }}
              </span>
              <span class="stat-label">キャンペーン</span>
            </div>
          </div>
        </div>
      </div>

      <!-- プラン別契約数 -->
      <div class="plan-breakdown">
        <h3>プラン別契約数</h3>
        <div class="plan-chart">
          <div v-for="plan in planBreakdown" :key="plan.planType" class="plan-bar-item">
            <div class="plan-bar-label">
              <span class="plan-name">{{ plan.name }}</span>
              <span class="plan-count">{{ plan.count }}</span>
            </div>
            <div class="plan-bar">
              <div
                class="plan-bar-fill"
                :class="plan.planType.toLowerCase()"
                :style="{ width: `${planBreakdown.length > 0 ? (plan.count / maxPlanCount) * 100 : 0}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'platform' as 'default',  // platform layout added - needs nuxt prepare
  middleware: 'platform-admin',
})

const loading = ref(true)

interface Stats {
  totalOrganizations: number
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
}

interface LaunchStatus {
  totalSlots: number
  remaining: number
  currentDiscount: number
  isLaunchPhase: boolean
}

interface PlanBreakdownItem {
  planType: string
  name: string
  count: number
}

const stats = ref<Stats>({
  totalOrganizations: 0,
  activeSubscriptions: 0,
  trialingSubscriptions: 0,
  canceledSubscriptions: 0,
})

const launchStatus = ref<LaunchStatus>({
  totalSlots: 0,
  remaining: 0,
  currentDiscount: 0,
  isLaunchPhase: false,
})

const planBreakdown = ref<PlanBreakdownItem[]>([])

const maxPlanCount = computed(() => {
  return Math.max(1, ...planBreakdown.value.map(p => p.count))
})

async function fetchDashboardData() {
  loading.value = true
  try {
    // 組織一覧を取得してサマリーを計算
    const [orgsRes, plansRes] = await Promise.all([
      $fetch('/api/platform/organizations'),
      $fetch('/api/billing/plans'),
    ])

    const orgs = (orgsRes as { organizations: Array<{
      subscription: { status: string; planType: string } | null
    }> }).organizations

    stats.value = {
      totalOrganizations: orgs.length,
      activeSubscriptions: orgs.filter(o => o.subscription?.status === 'ACTIVE').length,
      trialingSubscriptions: orgs.filter(o => o.subscription?.status === 'TRIALING').length,
      canceledSubscriptions: orgs.filter(o => o.subscription?.status === 'CANCELED').length,
    }

    // プラン別集計
    const planCounts: Record<string, number> = {}
    orgs.forEach(org => {
      if (org.subscription?.planType) {
        planCounts[org.subscription.planType] = (planCounts[org.subscription.planType] || 0) + 1
      }
    })

    const planNames: Record<string, string> = {
      STARTER: 'スターター',
      BUSINESS: 'ビジネス',
      ENTERPRISE: 'エンタープライズ',
    }

    planBreakdown.value = Object.entries(planCounts).map(([planType, count]) => ({
      planType,
      name: planNames[planType] || planType,
      count,
    }))

    // ローンチステータス
    const billingPlans = plansRes as { launchStatus: LaunchStatus }
    launchStatus.value = billingPlans.launchStatus

  } catch (e) {
    console.error('Dashboard data fetch error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboardData)
</script>

<style scoped>
.platform-dashboard {
  max-width: 1200px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #64748b;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* サマリーカード */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon span {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 24px;
  color: #fff;
}

.card-icon.blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.card-icon.green { background: linear-gradient(135deg, #22c55e, #16a34a); }
.card-icon.yellow { background: linear-gradient(135deg, #f59e0b, #d97706); }
.card-icon.gray { background: linear-gradient(135deg, #94a3b8, #64748b); }

.card-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
}

.card-label {
  font-size: 0.85rem;
  color: #64748b;
}

/* ローンチステータス */
.launch-status-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.launch-status-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
}

.launch-content {
  display: flex;
  gap: 40px;
  align-items: center;
}

.launch-progress {
  flex: 1;
}

.progress-bar {
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-label {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #64748b;
}

.launch-info {
  display: flex;
  gap: 32px;
}

.launch-stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-value.active { color: #22c55e; }
.stat-value.inactive { color: #94a3b8; }

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
}

/* プラン別契約数 */
.plan-breakdown {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.plan-breakdown h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
}

.plan-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-bar-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.plan-name {
  color: #475569;
  font-weight: 500;
}

.plan-count {
  color: #1e293b;
  font-weight: 600;
}

.plan-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.plan-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
  min-width: 4px;
}

.plan-bar-fill.starter { background: #94a3b8; }
.plan-bar-fill.business { background: #3b82f6; }
.plan-bar-fill.enterprise { background: #8b5cf6; }

@media (max-width: 1024px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .launch-content {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
