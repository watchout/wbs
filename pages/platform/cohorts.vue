<template>
  <div class="platform-cohorts">
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="cohorts-container">
      <div class="cohorts-info">
        <p>ローンチ割引のコホート（段階的割引枠）を管理します。先着順で割引率が適用されます。</p>
      </div>

      <div class="cohorts-table-container">
        <table class="cohorts-table">
          <thead>
            <tr>
              <th>コホート番号</th>
              <th>契約枠数</th>
              <th>累積枠</th>
              <th>割引率</th>
              <th>Stripe Coupon ID</th>
              <th>有効</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(cohort, index) in cohorts"
              :key="cohort.id"
              :class="{ inactive: !cohort.isActive, current: isCurrent(cohort) }"
            >
              <td>
                <div class="cohort-number">
                  <span class="number-badge">{{ cohort.cohortNumber }}</span>
                  <span v-if="isCurrent(cohort)" class="current-badge">現在</span>
                </div>
              </td>
              <td>
                <input
                  type="number"
                  v-model.number="cohort.maxOrgs"
                  class="inline-input number"
                  @blur="saveCohort(cohort)"
                />
              </td>
              <td class="cumulative">
                {{ getCumulativeSlots(index) }}
              </td>
              <td>
                <div class="discount-input">
                  <input
                    type="number"
                    v-model.number="cohort.discountPercent"
                    class="inline-input number"
                    @blur="saveCohort(cohort)"
                  />
                  <span>%</span>
                </div>
              </td>
              <td>
                <input
                  v-model="cohort.stripeCouponId"
                  class="inline-input"
                  placeholder="未設定"
                  @blur="saveCohort(cohort)"
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  :checked="cohort.isActive"
                  @change="toggleActive(cohort)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="cohorts-summary">
        <div class="summary-item">
          <span class="summary-label">総枠数</span>
          <span class="summary-value">{{ totalSlots }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">使用済み</span>
          <span class="summary-value">{{ usedSlots }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">残り枠</span>
          <span class="summary-value">{{ totalSlots - usedSlots }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">現在の割引</span>
          <span class="summary-value highlight">{{ currentDiscount }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'platform' as 'default',  // platform layout added - needs nuxt prepare
  middleware: 'platformAdmin' as 'auth',  // platformAdmin middleware added - needs nuxt prepare
})

const loading = ref(true)
const error = ref('')
const successMessage = ref('')

interface CohortConfig {
  id: string
  cohortNumber: number
  maxOrgs: number
  discountPercent: number
  stripeCouponId: string | null
  isActive: boolean
}

const cohorts = ref<CohortConfig[]>([])
const usedSlots = ref(0)
const currentDiscount = ref(0)

const totalSlots = computed(() => {
  return cohorts.value
    .filter(c => c.isActive)
    .reduce((sum, c) => sum + c.maxOrgs, 0)
})

function getCumulativeSlots(index: number): number {
  return cohorts.value
    .slice(0, index + 1)
    .filter(c => c.isActive)
    .reduce((sum, c) => sum + c.maxOrgs, 0)
}

function isCurrent(cohort: CohortConfig): boolean {
  if (!cohort.isActive) return false

  let cumulative = 0
  for (const c of cohorts.value) {
    if (!c.isActive) continue
    cumulative += c.maxOrgs
    if (usedSlots.value < cumulative) {
      return c.id === cohort.id
    }
  }
  return false
}

async function fetchCohorts() {
  loading.value = true
  try {
    const [cohortsRes, plansRes] = await Promise.all([
      $fetch('/api/platform/cohorts'),
      $fetch('/api/billing/plans'),
    ])

    cohorts.value = (cohortsRes as { cohorts: CohortConfig[] }).cohorts
    const launchStatus = (plansRes as { launchStatus: { remaining: number; totalSlots: number; currentDiscount: number } }).launchStatus
    usedSlots.value = launchStatus.totalSlots - launchStatus.remaining
    currentDiscount.value = launchStatus.currentDiscount
  } catch (e) {
    error.value = 'コホートの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

async function saveCohort(cohort: CohortConfig) {
  error.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/platform/cohorts/${cohort.id}`, {
      method: 'PATCH',
      body: {
        maxOrgs: cohort.maxOrgs,
        discountPercent: cohort.discountPercent,
        stripeCouponId: cohort.stripeCouponId,
        isActive: cohort.isActive,
      },
    })
    successMessage.value = '保存しました'
    setTimeout(() => { successMessage.value = '' }, 2000)
  } catch (e) {
    error.value = '保存に失敗しました'
  }
}

async function toggleActive(cohort: CohortConfig) {
  cohort.isActive = !cohort.isActive
  await saveCohort(cohort)
}

onMounted(fetchCohorts)
</script>

<style scoped>
.platform-cohorts {
  max-width: 1000px;
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
  margin-bottom: 16px;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.cohorts-info {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.cohorts-info p {
  color: #0369a1;
  font-size: 0.9rem;
  margin: 0;
}

.cohorts-table-container {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.cohorts-table {
  width: 100%;
  border-collapse: collapse;
}

.cohorts-table th {
  text-align: left;
  padding: 14px 16px;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.cohorts-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
  color: #1e293b;
}

.cohorts-table tr.inactive td {
  opacity: 0.5;
}

.cohorts-table tr.current {
  background: #f0f9ff;
}

.cohort-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #e2e8f0;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.85rem;
  color: #475569;
}

.current-badge {
  font-size: 0.7rem;
  background: #22c55e;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.inline-input {
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1e293b;
  width: 100%;
}

.inline-input:focus {
  border-color: #3b82f6;
  background: #f8fafc;
  outline: none;
}

.inline-input.number {
  width: 80px;
}

.discount-input {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
}

.cumulative {
  color: #64748b;
  font-weight: 500;
}

.cohorts-summary {
  display: flex;
  gap: 24px;
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 0.8rem;
  color: #64748b;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.summary-value.highlight {
  color: #3b82f6;
}
</style>
