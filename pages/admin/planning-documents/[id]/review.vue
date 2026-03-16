<template>
  <div class="review-page">
    <div class="page-header">
      <router-link to="/admin/planning-documents" class="back-link">
        ← 一覧に戻る
      </router-link>
      <h1>工程表 確認・修正</h1>
      <p class="subtitle">{{ fileName }}</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>

    <div v-else class="content">
      <!-- プロジェクト情報 -->
      <section class="project-info card">
        <h2>プロジェクト情報</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>プロジェクト名</label>
            <p>{{ parseResults.projectName || '（未指定）' }}</p>
          </div>
          <div class="info-item">
            <label>工期</label>
            <p v-if="parseResults.duration?.startDate && parseResults.duration?.endDate">
              {{ parseResults.duration.startDate }} ～ {{ parseResults.duration.endDate }}
            </p>
            <p v-else>（未指定）</p>
          </div>
          <div class="info-item">
            <label>解析信頼度</label>
            <div class="confidence-bar">
              <div class="bar-fill" :style="{ width: overallConfidence + '%' }"></div>
            </div>
            <p>{{ overallConfidence }}%</p>
          </div>
        </div>

        <!-- 警告メッセージ -->
        <div v-if="parseResults.warnings?.length" class="warnings">
          <h3>⚠️ 注意事項</h3>
          <ul>
            <li v-for="(warning, idx) in parseResults.warnings" :key="idx">
              {{ warning }}
            </li>
          </ul>
        </div>
      </section>

      <!-- 解析結果テーブル -->
      <section class="demands-section card">
        <h2>抽出された作業内容（{{ demands.length }}件）</h2>

        <div class="table-wrapper">
          <table class="demands-table">
            <thead>
              <tr>
                <th>#</th>
                <th>作業内容</th>
                <th>必要人数</th>
                <th>優先度</th>
                <th>時間帯</th>
                <th>信頼度</th>
                <th>備考</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(demand, idx) in demands" :key="idx" class="demand-row">
                <td class="index-col">{{ idx + 1 }}</td>
                <td class="task-col">
                  <input
                    v-if="editingIdx === idx"
                    v-model="demand.taskName"
                    type="text"
                    class="form-input"
                  />
                  <span v-else>{{ demand.taskName }}</span>
                </td>
                <td class="count-col">
                  <input
                    v-if="editingIdx === idx"
                    v-model.number="demand.requiredCount"
                    type="number"
                    min="0"
                    class="form-input"
                  />
                  <span v-else>{{ demand.requiredCount }}名</span>
                </td>
                <td class="priority-col">
                  <select
                    v-if="editingIdx === idx"
                    v-model="demand.priority"
                    class="form-input"
                  >
                    <option value="LOW">低</option>
                    <option value="MEDIUM">中</option>
                    <option value="HIGH">高</option>
                  </select>
                  <span v-else :class="`priority-${demand.priority.toLowerCase()}`">
                    {{ formatPriority(demand.priority) }}
                  </span>
                </td>
                <td class="timeSlot-col">
                  <span>{{ demand.timeSlots.join(', ') }}</span>
                </td>
                <td class="confidence-col">
                  <span v-if="demand.confidence" class="confidence-badge">
                    {{ Math.round(demand.confidence * 100) }}%
                  </span>
                  <span v-else class="confidence-badge">-</span>
                </td>
                <td class="notes-col">
                  <input
                    v-if="editingIdx === idx"
                    v-model="demand.notes"
                    type="text"
                    class="form-input"
                    placeholder="特記事項"
                  />
                  <span v-else>{{ demand.notes || '-' }}</span>
                </td>
                <td class="actions-col">
                  <button
                    v-if="editingIdx === idx"
                    type="button"
                    @click="saveEdit(idx)"
                    class="btn btn-small btn-primary"
                  >
                    保存
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="startEdit(idx)"
                    class="btn btn-small btn-secondary"
                  >
                    編集
                  </button>
                  <button
                    v-if="editingIdx === idx"
                    type="button"
                    @click="cancelEdit"
                    class="btn btn-small btn-tertiary"
                  >
                    キャンセル
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Site選択 -->
      <section class="site-selection card">
        <h2>現場を選択</h2>
        <div class="form-group">
          <label for="site-select">現場名</label>
          <select id="site-select" v-model="selectedSiteId" class="form-input">
            <option value="">-- 選択してください --</option>
            <option v-for="site in availableSites" :key="site.id" :value="site.id">
              {{ site.name }}
            </option>
          </select>
        </div>
      </section>

      <!-- エラーメッセージ -->
      <div v-if="errorMessage" class="error-message">
        <Icon name="carbon:warning-fill" size="20" />
        <span>{{ errorMessage }}</span>
        <button type="button" @click="errorMessage = ''" class="btn-close">×</button>
      </div>

      <!-- アクションボタン -->
      <div class="actions">
        <button
          type="button"
          @click="goBack"
          class="btn btn-secondary"
        >
          キャンセル
        </button>
        <button
          type="button"
          @click="confirmAndCreate"
          class="btn btn-primary"
          :disabled="!selectedSiteId || isSubmitting"
        >
          {{ isSubmitting ? '処理中...' : '確定して作業内容を保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Icon from '~icons/carbon/warning-fill'

interface Site {
  id: string
  name: string
}

interface Demand {
  index: number
  taskName: string
  requiredCount: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  timeSlots: string[]
  notes?: string
  confidence?: number
}

interface ParseResults {
  documentId: string
  fileName: string
  projectName?: string
  duration?: {
    startDate?: string
    endDate?: string
  }
  demands: Demand[]
  overallConfidence: number
  parseStatus: string
  uploadedAt: string
  warnings?: string[]
}

const router = useRouter()
const route = useRoute()

const documentId = route.params.id as string
const loading = ref(true)
const errorMessage = ref('')
const isSubmitting = ref(false)
const fileName = ref('')
const parseResults = ref<ParseResults | null>(null)
const demands = ref<Demand[]>([])
const selectedSiteId = ref('')
const availableSites = ref<Site[]>([])
const editingIdx = ref<number | null>(null)
const originalDemand = ref<Demand | null>(null)

const overallConfidence = computed(() => {
  return parseResults.value ? Math.round(parseResults.value.overallConfidence * 100) : 0
})

// パースレジュルト取得
const fetchParseResults = async () => {
  loading.value = true
  try {
    const response = await $fetch(
      `/api/planning-documents/${documentId}/parse-results`
    )
    parseResults.value = response
    fileName.value = response.fileName
    demands.value = response.demands || []
    await fetchAvailableSites()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

// 利用可能な現場取得
const fetchAvailableSites = async () => {
  try {
    const response = await $fetch('/api/sites')
    availableSites.value = response.data || []
  } catch (error) {
    console.error('Failed to fetch sites', error)
  }
}

// 編集開始
const startEdit = (idx: number) => {
  originalDemand.value = JSON.parse(JSON.stringify(demands.value[idx]))
  editingIdx.value = idx
}

// 編集保存
const saveEdit = (idx: number) => {
  editingIdx.value = null
  originalDemand.value = null
  // 修正内容はメモリ内で保持され、確定時に送信
}

// 編集キャンセル
const cancelEdit = () => {
  if (originalDemand.value !== null && editingIdx.value !== null) {
    demands.value[editingIdx.value] = originalDemand.value
  }
  editingIdx.value = null
  originalDemand.value = null
}

// 確定・保存
const confirmAndCreate = async () => {
  if (!selectedSiteId.value) {
    errorMessage.value = '現場を選択してください'
    return
  }

  isSubmitting.value = true
  try {
    const confirmData = {
      siteId: selectedSiteId.value,
      demands: demands.value.map((d) => ({
        index: d.index,
        taskName: d.taskName,
        requiredCount: d.requiredCount,
        priority: d.priority,
        timeSlots: d.timeSlots,
        date: new Date().toISOString().split('T')[0], // 今日の日付
        notes: d.notes,
      })),
    }

    const response = await $fetch(`/api/planning-documents/${documentId}/confirm`, {
      method: 'PUT',
      body: confirmData,
    })

    if (response) {
      // 成功メッセージを表示
      alert('作業内容を保存しました！')
      router.push('/admin/planning-documents')
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '保存に失敗しました'
  } finally {
    isSubmitting.value = false
  }
}

// 戻る
const goBack = () => {
  router.push('/admin/planning-documents')
}

// ヘルパー関数
const formatPriority = (priority: string): string => {
  const map: { [key: string]: string } = {
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  }
  return map[priority] || priority
}

onMounted(() => {
  fetchParseResults()
})
</script>

<style scoped lang="scss">
.review-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;

  .back-link {
    display: inline-block;
    color: #0066cc;
    text-decoration: none;
    margin-bottom: 1rem;
    font-size: 0.95rem;

    &:hover {
      text-decoration: underline;
    }
  }

  h1 {
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #666;
    font-size: 0.95rem;
    margin: 0;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #999;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f0f0f0;
    border-top: 4px solid #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 2rem;

  h2 {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: #333;
  }
}

// プロジェクト情報
.project-info {
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .info-item {
    label {
      display: block;
      font-weight: 500;
      color: #666;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    p {
      margin: 0;
      color: #333;
      font-size: 1rem;
    }
  }

  .confidence-bar {
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #66bb6a, #43a047);
      transition: width 0.3s;
    }
  }

  .warnings {
    margin-top: 2rem;
    padding: 1rem;
    background: #fff3e0;
    border-left: 4px solid #ff9800;
    border-radius: 4px;

    h3 {
      margin: 0 0 1rem 0;
      color: #e65100;
    }

    ul {
      margin: 0;
      padding-left: 1.5rem;

      li {
        color: #e65100;
        margin-bottom: 0.5rem;
      }
    }
  }
}

// 需要テーブル
.demands-section {
  .table-wrapper {
    overflow-x: auto;
  }

  .demands-table {
    width: 100%;
    border-collapse: collapse;

    thead {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 0.9rem;
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      font-size: 0.95rem;
    }

    .index-col {
      width: 40px;
      text-align: center;
      color: #999;
    }

    .task-col {
      min-width: 150px;
    }

    .count-col {
      width: 100px;
      text-align: center;
    }

    .priority-col {
      width: 80px;

      .priority-high {
        color: #d32f2f;
        font-weight: 500;
      }

      .priority-medium {
        color: #f57c00;
        font-weight: 500;
      }

      .priority-low {
        color: #558b2f;
        font-weight: 500;
      }
    }

    .timeSlot-col {
      width: 100px;
    }

    .confidence-col {
      width: 80px;
      text-align: center;

      .confidence-badge {
        display: inline-block;
        padding: 0.3rem 0.6rem;
        background: #e3f2fd;
        color: #1565c0;
        border-radius: 3px;
        font-size: 0.85rem;
        font-weight: 500;
      }
    }

    .notes-col {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #999;
    }

    .actions-col {
      width: 120px;
      text-align: center;
    }

    .form-input {
      width: 100%;
      padding: 0.4rem;
      border: 1px solid #0066cc;
      border-radius: 3px;
      font-size: 0.9rem;

      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
      }
    }

    .btn {
      padding: 0.4rem 0.8rem;
      margin: 0 0.2rem;
      border: none;
      border-radius: 3px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;

      &.btn-small {
        padding: 0.3rem 0.6rem;
        font-size: 0.75rem;
      }

      &.btn-primary {
        background: #0066cc;
        color: white;

        &:hover {
          background: #0052a3;
        }
      }

      &.btn-secondary {
        background: #f0f0f0;
        color: #333;

        &:hover {
          background: #e0e0e0;
        }
      }

      &.btn-tertiary {
        background: none;
        color: #999;
        border: 1px solid #ddd;

        &:hover {
          color: #666;
        }
      }
    }
  }
}

// Site選択
.site-selection {
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    label {
      font-weight: 500;
      color: #333;
    }

    .form-input {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
      }
    }
  }
}

// エラーメッセージ
.error-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff5f5;
  border-left: 4px solid #ff4444;
  border-radius: 4px;
  color: #cc0000;

  .btn-close {
    margin-left: auto;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #cc0000;
  }
}

// アクションボタン
.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 2rem;
  border-top: 1px solid #e0e0e0;

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &.btn-primary {
      background: #0066cc;
      color: white;

      &:hover:not(:disabled) {
        background: #0052a3;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &.btn-secondary {
      background: #f0f0f0;
      color: #333;

      &:hover {
        background: #e0e0e0;
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
