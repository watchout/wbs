<template>
  <div class="shortages-page">
    <div class="page-header">
      <h1>不足一覧</h1>
      <div class="week-toggle">
        <button
          class="week-btn"
          :class="{ active: selectedWeek === 'this' }"
          @click="selectedWeek = 'this'"
        >
          今週
        </button>
        <button
          class="week-btn"
          :class="{ active: selectedWeek === 'next' }"
          @click="selectedWeek = 'next'"
        >
          来週
        </button>
      </div>
    </div>

    <!-- サマリー -->
    <div v-if="summary" class="summary-bar">
      <div class="summary-item summary-shortage">
        不足: {{ summary.shortageCount }}件
      </div>
      <div class="summary-item summary-sufficient">
        充足: {{ summary.sufficientCount }}件
      </div>
      <div class="summary-item summary-surplus">
        過剰: {{ summary.surplusCount }}件
      </div>
    </div>

    <!-- 不足一覧テーブル -->
    <table class="shortages-table">
      <thead>
        <tr>
          <th>現場名</th>
          <th>日付</th>
          <th>工種</th>
          <th>必要人数</th>
          <th>配置人数</th>
          <th>過不足</th>
          <th>優先度</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="`${item.siteId}-${item.date}-${item.tradeType}`"
          :class="getRowClass(item.status)"
        >
          <td class="site-name">{{ item.siteName }}</td>
          <td>{{ formatDateDisplay(item.date) }}</td>
          <td>{{ item.tradeType }}</td>
          <td class="count-cell">{{ item.requiredCount }}</td>
          <td class="count-cell">{{ item.allocatedCount }}</td>
          <td class="gap-cell" :class="getGapClass(item.gap)">
            {{ item.gap > 0 ? '+' : '' }}{{ item.gap }}
          </td>
          <td>
            <span class="priority-badge" :class="getPriorityClass(item.priority)">
              {{ getPriorityLabel(item.priority) }}
            </span>
          </td>
          <td>
            <button
              v-if="item.gap < 0"
              class="btn-propose"
              :disabled="proposalLoading"
              @click="requestProposal(item)"
            >
              候補提案
            </button>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td colspan="7" class="no-data">
            {{ loading ? '読み込み中...' : 'データがありません' }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- AI提案モーダル -->
    <div v-if="proposal" class="proposal-overlay" @click.self="closeProposal">
      <div class="proposal-modal">
        <div class="proposal-header">
          <h2>AI配置提案</h2>
          <button class="modal-close" @click="closeProposal">×</button>
        </div>
        <div class="proposal-info">
          <span class="proposal-site">{{ proposal.siteName }}</span>
          <span class="proposal-date">{{ formatDateDisplay(proposal.date) }}</span>
          <span class="proposal-gap">不足 {{ proposal.shortage }}名</span>
        </div>
        <div class="candidates-list">
          <label
            v-for="c in proposal.candidates"
            :key="c.userId"
            class="candidate-row"
            :class="{ selected: selectedUserIds.includes(c.userId) }"
          >
            <input
              type="checkbox"
              :value="c.userId"
              v-model="selectedUserIds"
            />
            <div class="candidate-info">
              <span class="candidate-name">{{ c.userName }}</span>
              <span class="candidate-dept">{{ c.department }}</span>
              <span class="candidate-score" :class="getScoreClass(c.score)">
                {{ c.score }}点
              </span>
            </div>
            <div class="candidate-reasons">
              <span
                v-for="(r, i) in c.reasons"
                :key="i"
                class="reason-tag"
              >{{ r }}</span>
            </div>
            <span
              class="availability-badge"
              :class="c.availability === 'free' ? 'avail-free' : 'avail-movable'"
            >
              {{ c.availability === 'free' ? '空き' : '移動可' }}
            </span>
          </label>
        </div>
        <div class="proposal-actions">
          <button
            class="btn-apply"
            :disabled="selectedUserIds.length === 0 || applyLoading"
            @click="applyProposal"
          >
            {{ applyLoading ? '処理中...' : `${selectedUserIds.length}名を仮配置` }}
          </button>
          <button class="btn-close" @click="closeProposal">閉じる</button>
        </div>
        <p v-if="applyResult" class="apply-result">{{ applyResult }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface CandidateScore {
  userId: string
  userName: string
  department: string
  score: number
  reasons: string[]
  availability: 'free' | 'movable'
}

interface Proposal {
  proposalId: string
  siteId: string
  siteName: string
  date: string
  tradeType: string
  required: number
  allocated: number
  shortage: number
  candidates: CandidateScore[]
}

interface ShortageItem {
  siteId: string
  siteName: string
  date: string
  tradeType: string
  requiredCount: number
  allocatedCount: number
  gap: number
  status: 'shortage' | 'sufficient' | 'surplus'
  priority: string
}

interface Summary {
  total: number
  shortageCount: number
  sufficientCount: number
  surplusCount: number
}

const selectedWeek = ref<'this' | 'next'>('this')
const items = ref<ShortageItem[]>([])
const summary = ref<Summary | null>(null)
const loading = ref(false)
const proposalLoading = ref(false)
const applyLoading = ref(false)
const proposal = ref<Proposal | null>(null)
const selectedUserIds = ref<string[]>([])
const applyResult = ref('')

async function requestProposal(item: ShortageItem) {
  proposalLoading.value = true
  try {
    const res = await $fetch<Proposal>('/api/ai/allocation-proposal', {
      method: 'POST',
      body: { siteId: item.siteId, date: item.date, tradeType: item.tradeType },
    })
    proposal.value = res
    selectedUserIds.value = []
    applyResult.value = ''
  } catch (err: unknown) {
    const msg = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'エラーが発生しました'
    alert(msg)
  } finally {
    proposalLoading.value = false
  }
}

async function applyProposal() {
  if (!proposal.value || selectedUserIds.value.length === 0) return
  applyLoading.value = true
  try {
    const res = await $fetch<{ message: string }>(`/api/ai/allocation-proposal/${proposal.value.proposalId}`, {
      method: 'POST',
      body: {
        siteId: proposal.value.siteId,
        date: proposal.value.date,
        selectedUserIds: selectedUserIds.value,
      },
    })
    applyResult.value = res.message
    fetchShortages()
  } catch {
    applyResult.value = '仮配置に失敗しました'
  } finally {
    applyLoading.value = false
  }
}

function closeProposal() {
  proposal.value = null
  selectedUserIds.value = []
  applyResult.value = ''
}

function getScoreClass(score: number): string {
  if (score >= 70) return 'score-high'
  if (score >= 40) return 'score-medium'
  return 'score-low'
}

function getWeekRange(week: 'this' | 'next'): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  if (week === 'next') {
    monday.setDate(monday.getDate() + 7)
  }

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    dateFrom: formatDate(monday),
    dateTo: formatDate(sunday),
  }
}

async function fetchShortages() {
  loading.value = true
  try {
    const { dateFrom, dateTo } = getWeekRange(selectedWeek.value)
    const response = await $fetch<{
      success: boolean
      data: { items: ShortageItem[]; summary: Summary }
    }>(`/api/site-allocation/shortages?dateFrom=${dateFrom}&dateTo=${dateTo}`)

    if (response.success) {
      items.value = response.data.items
      summary.value = response.data.summary
    }
  } catch {
    items.value = []
    summary.value = null
  } finally {
    loading.value = false
  }
}

function getRowClass(status: string): string {
  const classes: Record<string, string> = {
    shortage: 'row-shortage',
    sufficient: 'row-sufficient',
    surplus: 'row-surplus',
  }
  return classes[status] || ''
}

function getGapClass(gap: number): string {
  if (gap < 0) return 'gap-shortage'
  if (gap > 0) return 'gap-surplus'
  return 'gap-sufficient'
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = { HIGH: '高', MEDIUM: '中', LOW: '低' }
  return labels[priority] || priority
}

function getPriorityClass(priority: string): string {
  const classes: Record<string, string> = {
    HIGH: 'priority-high',
    MEDIUM: 'priority-medium',
    LOW: 'priority-low',
  }
  return classes[priority] || ''
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr)
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`
}

watch(selectedWeek, () => fetchShortages())
onMounted(() => fetchShortages())
</script>

<style scoped>
.shortages-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: bold;
}

.week-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.week-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: white;
  cursor: pointer;
  font-weight: 500;
}

.week-btn.active {
  background: #2563eb;
  color: white;
}

.summary-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-item {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.summary-shortage { background: #fef2f2; color: #dc2626; }
.summary-sufficient { background: #f0fdf4; color: #16a34a; }
.summary-surplus { background: #fefce8; color: #ca8a04; }

.shortages-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.shortages-table th,
.shortages-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.shortages-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.85rem;
  color: #555;
}

.site-name { font-weight: 600; }

.count-cell { text-align: center; }

.gap-cell {
  text-align: center;
  font-weight: 700;
}

.gap-shortage { color: #dc2626; }
.gap-sufficient { color: #16a34a; }
.gap-surplus { color: #ca8a04; }

/* 行の背景色 */
.row-shortage { background: #fef2f2; }
.row-sufficient { background: #f0fdf4; }
.row-surplus { background: #fefce8; }

.priority-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
}

.priority-high { background: #fee2e2; color: #dc2626; }
.priority-medium { background: #fef3c7; color: #d97706; }
.priority-low { background: #e0f2fe; color: #0369a1; }

.no-data {
  text-align: center;
  color: #888;
  padding: 2rem !important;
}

/* 提案ボタン */
.btn-propose {
  padding: 4px 10px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
}
.btn-propose:hover:not(:disabled) { background: #4f46e5; }
.btn-propose:disabled { opacity: 0.5; cursor: not-allowed; }

/* モーダル */
.proposal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
.proposal-modal {
  background: white; border-radius: 12px; width: 520px; max-height: 80vh;
  overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
}
.proposal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #e5e7eb;
}
.proposal-header h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; }
.proposal-info {
  display: flex; gap: 12px; padding: 12px 20px; background: #f9fafb;
  font-size: 0.875rem; align-items: center;
}
.proposal-site { font-weight: 600; }
.proposal-gap { color: #dc2626; font-weight: 600; }

/* 候補リスト */
.candidates-list { padding: 8px 20px; }
.candidate-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;
  cursor: pointer; transition: background 0.15s; flex-wrap: wrap;
}
.candidate-row:hover { background: #f3f4f6; }
.candidate-row.selected { background: #eef2ff; border-color: #6366f1; }
.candidate-info { display: flex; gap: 8px; align-items: center; flex: 1; min-width: 0; }
.candidate-name { font-weight: 600; font-size: 0.875rem; }
.candidate-dept { color: #6b7280; font-size: 0.75rem; }
.candidate-score { font-weight: 700; font-size: 0.875rem; }
.score-high { color: #059669; }
.score-medium { color: #d97706; }
.score-low { color: #9ca3af; }
.candidate-reasons { display: flex; gap: 4px; flex-wrap: wrap; width: 100%; padding-left: 24px; }
.reason-tag {
  background: #f3f4f6; padding: 2px 6px; border-radius: 4px;
  font-size: 0.7rem; color: #4b5563;
}
.availability-badge {
  font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 500;
}
.avail-free { background: #d1fae5; color: #059669; }
.avail-movable { background: #fef3c7; color: #d97706; }

/* アクション */
.proposal-actions {
  display: flex; gap: 8px; padding: 12px 20px; border-top: 1px solid #e5e7eb;
}
.btn-apply {
  flex: 1; background: #6366f1; color: white; border: none;
  border-radius: 6px; padding: 10px; font-weight: 600; cursor: pointer;
}
.btn-apply:hover:not(:disabled) { background: #4f46e5; }
.btn-apply:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-close {
  background: white; border: 1px solid #d1d5db; border-radius: 6px;
  padding: 10px 16px; cursor: pointer; color: #6b7280;
}
.apply-result { padding: 8px 20px; font-size: 0.875rem; color: #059669; text-align: center; }
</style>
