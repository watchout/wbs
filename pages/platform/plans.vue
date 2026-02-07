<template>
  <div class="platform-plans">
    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="plans-grid">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card"
        :class="{ recommended: plan.isRecommended, inactive: !plan.isActive }"
      >
        <div class="plan-header">
          <div class="plan-type-badge" :class="plan.planType.toLowerCase()">
            {{ plan.planType }}
          </div>
          <label class="active-toggle">
            <input
              type="checkbox"
              :checked="plan.isActive"
              @change="toggleActive(plan)"
            />
            <span>{{ plan.isActive ? '有効' : '無効' }}</span>
          </label>
        </div>

        <div class="plan-name-section">
          <input
            v-model="plan.name"
            class="plan-name-input"
            @blur="savePlan(plan)"
          />
          <label class="recommended-toggle">
            <input
              type="checkbox"
              :checked="plan.isRecommended"
              @change="toggleRecommended(plan)"
            />
            推奨
          </label>
        </div>

        <div class="plan-field">
          <label>月額価格（税抜）</label>
          <div class="price-input">
            <span class="currency">¥</span>
            <input
              type="number"
              v-model.number="plan.monthlyPrice"
              @blur="savePlan(plan)"
            />
          </div>
        </div>

        <div class="plan-field">
          <label>年額価格（税抜）</label>
          <div class="price-input">
            <span class="currency">¥</span>
            <input
              type="number"
              :value="plan.annualPrice ?? ''"
              @input="plan.annualPrice = ($event.target as HTMLInputElement)?.value ? Number(($event.target as HTMLInputElement).value) : null"
              @blur="savePlan(plan)"
              placeholder="未設定"
            />
          </div>
        </div>

        <div class="plan-field">
          <label>ユーザー上限</label>
          <div class="number-input">
            <input
              type="number"
              v-model.number="plan.maxUsers"
              @blur="savePlan(plan)"
            />
            <span class="suffix">名</span>
          </div>
        </div>

        <div class="plan-field">
          <label>月間AIクレジット</label>
          <div class="number-input">
            <input
              type="number"
              v-model.number="plan.monthlyAiCredits"
              @blur="savePlan(plan)"
            />
            <span class="suffix">{{ plan.monthlyAiCredits === -1 ? '(無制限)' : '回' }}</span>
          </div>
        </div>

        <div class="plan-field">
          <label>機能（カンマ区切り）</label>
          <textarea
            :value="plan.features.join(', ')"
            @blur="updateFeatures(plan, $event)"
            rows="2"
          ></textarea>
        </div>

        <div class="plan-field">
          <label>機能ラベル（カンマ区切り）</label>
          <textarea
            :value="plan.featureLabels.join(', ')"
            @blur="updateFeatureLabels(plan, $event)"
            rows="2"
          ></textarea>
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

interface PlanConfig {
  id: string
  planType: string
  name: string
  description: string | null
  monthlyPrice: number
  annualPrice: number | null
  maxUsers: number
  monthlyAiCredits: number
  features: string[]
  featureLabels: string[]
  isRecommended: boolean
  sortOrder: number
  isActive: boolean
}

const plans = ref<PlanConfig[]>([])

async function fetchPlans() {
  loading.value = true
  try {
    const res = await $fetch('/api/platform/plans')
    plans.value = (res as { plans: PlanConfig[] }).plans
  } catch (e) {
    error.value = 'プランの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

async function savePlan(plan: PlanConfig) {
  error.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/platform/plans/${plan.id}`, {
      method: 'PATCH',
      body: {
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxUsers: plan.maxUsers,
        monthlyAiCredits: plan.monthlyAiCredits,
        features: plan.features,
        featureLabels: plan.featureLabels,
        isRecommended: plan.isRecommended,
        isActive: plan.isActive,
      },
    })
    successMessage.value = '保存しました'
    setTimeout(() => { successMessage.value = '' }, 2000)
  } catch (e) {
    error.value = '保存に失敗しました'
  }
}

async function toggleActive(plan: PlanConfig) {
  plan.isActive = !plan.isActive
  await savePlan(plan)
}

async function toggleRecommended(plan: PlanConfig) {
  plan.isRecommended = !plan.isRecommended
  await savePlan(plan)
}

function updateFeatures(plan: PlanConfig, event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  plan.features = value.split(',').map(f => f.trim()).filter(f => f)
  savePlan(plan)
}

function updateFeatureLabels(plan: PlanConfig, event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  plan.featureLabels = value.split(',').map(f => f.trim()).filter(f => f)
  savePlan(plan)
}

onMounted(fetchPlans)
</script>

<style scoped>
.platform-plans {
  max-width: 1400px;
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

.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.plan-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 2px solid transparent;
}

.plan-card.recommended {
  border-color: #3b82f6;
}

.plan-card.inactive {
  opacity: 0.6;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.plan-type-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.plan-type-badge.starter { background: #e2e8f0; color: #475569; }
.plan-type-badge.business { background: #dbeafe; color: #1d4ed8; }
.plan-type-badge.enterprise { background: #ede9fe; color: #6d28d9; }

.active-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #64748b;
  cursor: pointer;
}

.active-toggle input {
  cursor: pointer;
}

.plan-name-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.plan-name-input {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 4px 0;
  background: transparent;
}

.plan-name-input:focus {
  border-bottom-color: #3b82f6;
  outline: none;
}

.recommended-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #3b82f6;
  cursor: pointer;
}

.plan-field {
  margin-bottom: 16px;
}

.plan-field label {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 6px;
}

.price-input,
.number-input {
  display: flex;
  align-items: center;
  gap: 4px;
}

.currency {
  color: #64748b;
  font-size: 0.9rem;
}

.suffix {
  color: #64748b;
  font-size: 0.85rem;
}

.plan-field input[type="number"],
.plan-field textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #1e293b;
}

.plan-field input[type="number"]:focus,
.plan-field textarea:focus {
  border-color: #3b82f6;
  outline: none;
}

.plan-field textarea {
  resize: vertical;
  font-family: inherit;
}

@media (max-width: 1200px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
