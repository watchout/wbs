<template>
  <div class="meeting-detail-page">
    <header class="page-header">
      <NuxtLink to="/meetings" class="back-link">← 戻る</NuxtLink>
      <h1>{{ meeting?.title || '読み込み中...' }}</h1>
    </header>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else-if="!meeting" class="error">会議が見つかりませんでした</div>

    <div v-else class="meeting-content">
      <div class="meeting-info-card">
        <div class="info-row">
          <span class="label">ステータス</span>
          <span class="status-badge" :class="meeting.status.toLowerCase()">
            {{ statusLabel(meeting.status) }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">会議時間</span>
          <span>{{ meeting.duration }}分</span>
        </div>
        <div class="info-row">
          <span class="label">候補期間</span>
          <span>{{ formatDateRange(meeting.dateRangeStart, meeting.dateRangeEnd) }}</span>
        </div>
        <div class="info-row" v-if="meeting.description">
          <span class="label">説明</span>
          <span>{{ meeting.description }}</span>
        </div>
        <div class="info-row" v-if="meeting.confirmedStart">
          <span class="label">確定日時</span>
          <span class="confirmed">{{ formatDateTime(meeting.confirmedStart) }}</span>
        </div>
      </div>

      <div class="section">
        <h2>候補日時</h2>
        <div v-if="candidates.length === 0" class="empty">候補日時がありません</div>
        <div v-else class="candidates-list">
          <div
            v-for="candidate in candidates"
            :key="candidate.id"
            class="candidate-item"
            :class="{ selected: selectedCandidates.includes(candidate.id) }"
            @click="toggleCandidate(candidate.id)"
          >
            <div class="candidate-time">
              {{ formatDateTime(candidate.start) }} - {{ formatTime(candidate.end) }}
            </div>
            <div class="candidate-info">
              <span v-if="candidate.isAiSuggested" class="ai-badge">🤖 AI提案</span>
              <span class="response-count">{{ candidate.responseCount }}名が可能</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>招待者</h2>
        <div class="invitees-list">
          <div v-for="invitee in invitees" :key="invitee.id" class="invitee-item">
            <span class="invitee-name">{{ invitee.user.name || invitee.user.email }}</span>
            <span class="invitee-status" :class="invitee.status.toLowerCase()">
              {{ invitee.status === 'RESPONDED' ? '✅ 回答済み' : '⏳ 未回答' }}
            </span>
          </div>
        </div>
      </div>

      <div class="actions" v-if="canRespond">
        <button class="btn btn-primary" @click="submitResponse" :disabled="selectedCandidates.length === 0 || submitting">
          {{ submitting ? '送信中...' : '回答を送信' }}
        </button>
      </div>

      <div class="actions" v-if="isOrganizer && meeting.status === 'OPEN'">
        <button class="btn btn-success" @click="confirmMeeting" :disabled="!selectedCandidateForConfirm || submitting">
          {{ submitting ? '確定中...' : '日程を確定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface Meeting {
  id: string
  title: string
  description: string | null
  status: string
  duration: number
  dateRangeStart: string
  dateRangeEnd: string
  confirmedStart: string | null
  organizer: { id: string; name: string | null }
}

interface Candidate {
  id: string
  start: string
  end: string
  isAiSuggested: boolean
  responseCount: number
}

interface Invitee {
  id: string
  user: { id: string; name: string | null; email: string }
  status: string
  selectedCandidateIds: string[] | null
}

const route = useRoute()
const router = useRouter()

const meeting = ref<Meeting | null>(null)
const candidates = ref<Candidate[]>([])
const invitees = ref<Invitee[]>([])
const loading = ref(true)
const submitting = ref(false)
const selectedCandidates = ref<string[]>([])
const currentUserId = ref<string | null>(null)

const isOrganizer = computed(() => meeting.value?.organizer?.id === currentUserId.value)
const canRespond = computed(() => {
  if (!meeting.value || meeting.value.status !== 'OPEN') return false
  const myInvitation = invitees.value.find(i => i.user.id === currentUserId.value)
  return myInvitation && myInvitation.status === 'PENDING'
})
const selectedCandidateForConfirm = computed(() => selectedCandidates.value[0] || null)

async function fetchMeeting() {
  loading.value = true
  try {
    const id = route.params.id as string
    const response = await $fetch<{
      success: boolean
      meeting: Meeting
      candidates: Candidate[]
      invitees: Invitee[]
    }>(`/api/meetings/${id}`)
    
    if (response.success) {
      meeting.value = response.meeting
      candidates.value = response.candidates
      invitees.value = response.invitees
    }

    // 現在のユーザーを取得
    const meResponse = await $fetch<{ user?: { id: string } }>('/api/auth/me')
    currentUserId.value = meResponse.user?.id ?? null
  } catch (error) {
    console.error('Failed to fetch meeting')
  } finally {
    loading.value = false
  }
}

function toggleCandidate(id: string) {
  const index = selectedCandidates.value.indexOf(id)
  if (index >= 0) {
    selectedCandidates.value.splice(index, 1)
  } else {
    selectedCandidates.value.push(id)
  }
}

async function submitResponse() {
  if (selectedCandidates.value.length === 0) return
  
  submitting.value = true
  try {
    const id = route.params.id as string
    await $fetch(`/api/meetings/${id}/respond`, {
      method: 'POST',
      body: { candidateIds: selectedCandidates.value }
    })
    await fetchMeeting()
  } catch (error: unknown) {
    const errData = error && typeof error === 'object' && 'data' in error ? (error as Record<string, unknown>).data as Record<string, unknown> | undefined : undefined
    alert(errData?.message || '回答の送信に失敗しました')
  } finally {
    submitting.value = false
  }
}

async function confirmMeeting() {
  if (!selectedCandidateForConfirm.value) return
  if (!confirm('この日程で確定しますか？')) return
  
  submitting.value = true
  try {
    const id = route.params.id as string
    await $fetch(`/api/meetings/${id}/confirm`, {
      method: 'POST',
      body: { candidateId: selectedCandidateForConfirm.value }
    })
    await fetchMeeting()
  } catch (error: unknown) {
    const errData = error && typeof error === 'object' && 'data' in error ? (error as Record<string, unknown>).data as Record<string, unknown> | undefined : undefined
    alert(errData?.message || '確定に失敗しました')
  } finally {
    submitting.value = false
  }
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: '下書き',
    OPEN: '回答受付中',
    CONFIRMED: '確定済み',
    CANCELLED: 'キャンセル'
  }
  return labels[status] || status
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(fetchMeeting)

useHead({ title: '日程調整詳細 | ミエルプラス' })
</script>

<style scoped>
.meeting-detail-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.back-link {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.back-link:hover {
  color: #1a73e8;
}

.page-header h1 {
  font-size: 1.5rem;
  color: #1a1a2e;
  margin-top: 0.5rem;
}

.meeting-info-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  color: #666;
  font-size: 0.9rem;
}

.status-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.open { background: #e8f5e9; color: #2e7d32; }
.status-badge.draft { background: #fff3e0; color: #e65100; }
.status-badge.confirmed { background: #e3f2fd; color: #1565c0; }
.status-badge.cancelled { background: #fce4ec; color: #c62828; }

.confirmed {
  color: #2e7d32;
  font-weight: 600;
}

.section {
  margin-bottom: 2rem;
}

.section h2 {
  font-size: 1.1rem;
  color: #1a1a2e;
  margin-bottom: 1rem;
}

.candidates-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.candidate-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-item:hover {
  border-color: #1a73e8;
}

.candidate-item.selected {
  border-color: #1a73e8;
  background: #e8f0fe;
}

.candidate-time {
  font-weight: 500;
}

.candidate-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ai-badge {
  font-size: 0.8rem;
  color: #5f6368;
}

.response-count {
  font-size: 0.85rem;
  color: #666;
}

.invitees-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.invitee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.invitee-status.responded {
  color: #2e7d32;
}

.invitee-status.pending {
  color: #e65100;
}

.actions {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.btn-success {
  background: #2e7d32;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1b5e20;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading, .error, .empty {
  text-align: center;
  padding: 2rem;
  color: #888;
}

@media (max-width: 768px) {
  .meeting-detail-page {
    padding: 1rem;
  }

  .candidate-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
