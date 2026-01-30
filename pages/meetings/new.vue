<template>
  <div class="meeting-create-page">
    <header class="page-header">
      <NuxtLink to="/meetings" class="back-link">← 戻る</NuxtLink>
      <h1>新規日程調整</h1>
    </header>

    <form @submit.prevent="createMeeting" class="meeting-form">
      <div class="form-group">
        <label>タイトル *</label>
        <input v-model="form.title" type="text" placeholder="会議のタイトル" required :disabled="submitting" />
      </div>

      <div class="form-group">
        <label>説明</label>
        <textarea v-model="form.description" rows="3" placeholder="会議の説明（任意）" :disabled="submitting"></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>会議時間（分）*</label>
          <select v-model.number="form.duration" :disabled="submitting">
            <option :value="15">15分</option>
            <option :value="30">30分</option>
            <option :value="60">60分</option>
            <option :value="90">90分</option>
            <option :value="120">2時間</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>候補期間（開始）*</label>
          <input v-model="form.dateRangeStart" type="date" required :disabled="submitting" />
        </div>
        <div class="form-group">
          <label>候補期間（終了）*</label>
          <input v-model="form.dateRangeEnd" type="date" required :disabled="submitting" />
        </div>
      </div>

      <div class="form-group">
        <label>招待者 *</label>
        <div class="invitee-list">
          <div v-for="user in users" :key="user.id" class="invitee-item">
            <input
              type="checkbox"
              :id="`user-${user.id}`"
              :value="user.id"
              v-model="form.inviteeUserIds"
              :disabled="submitting"
            />
            <label :for="`user-${user.id}`">
              {{ user.name || user.email }}
              <span class="department" v-if="user.department">({{ user.department.name }})</span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div class="form-actions">
        <NuxtLink to="/meetings" class="btn">キャンセル</NuxtLink>
        <button type="submit" class="btn btn-primary" :disabled="submitting || form.inviteeUserIds.length === 0">
          {{ submitting ? '作成中...' : 'AI候補を生成して作成' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface User {
  id: string
  email: string
  name: string | null
  department: { id: string; name: string } | null
}

const router = useRouter()

const users = ref<User[]>([])
const submitting = ref(false)
const error = ref('')

const form = ref({
  title: '',
  description: '',
  duration: 60,
  dateRangeStart: '',
  dateRangeEnd: '',
  inviteeUserIds: [] as string[]
})

// デフォルトの日付範囲を設定（翌日から1週間）
function initDateRange() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(tomorrow)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  form.value.dateRangeStart = formatDate(tomorrow)
  form.value.dateRangeEnd = formatDate(nextWeek)
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function fetchUsers() {
  try {
    const response = await $fetch<{ success: boolean; users: User[] }>('/api/users')
    if (response.success) {
      users.value = response.users
    }
  } catch (err) {
    console.error('Failed to fetch users')
  }
}

async function createMeeting() {
  if (!form.value.title.trim()) {
    error.value = 'タイトルは必須です'
    return
  }
  if (form.value.inviteeUserIds.length === 0) {
    error.value = '招待者を選択してください'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await $fetch<{ success: boolean; meeting: { id: string } }>('/api/meetings', {
      method: 'POST',
      body: {
        title: form.value.title,
        description: form.value.description || undefined,
        duration: form.value.duration,
        dateRangeStart: new Date(form.value.dateRangeStart).toISOString(),
        dateRangeEnd: new Date(form.value.dateRangeEnd).toISOString(),
        inviteeUserIds: form.value.inviteeUserIds,
        autoSuggestCandidates: true
      }
    })

    if (response.success) {
      router.push(`/meetings/${response.meeting.id}`)
    }
  } catch (err: any) {
    error.value = err.data?.message || '作成に失敗しました'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  initDateRange()
  fetchUsers()
})

useHead({ title: '新規日程調整 | ミエルプラス' })
</script>

<style scoped>
.meeting-create-page {
  max-width: 600px;
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

.meeting-form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1a73e8;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.invitee-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem;
}

.invitee-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.invitee-item:hover {
  background: #f5f5f5;
}

.invitee-item label {
  cursor: pointer;
  margin-bottom: 0;
  font-weight: normal;
}

.invitee-item .department {
  color: #888;
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  text-decoration: none;
  display: inline-block;
  background: #f0f0f0;
  color: #333;
}

.btn:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #d93025;
  font-size: 0.9rem;
  padding: 0.75rem;
  background: #ffeaea;
  border-radius: 8px;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .meeting-create-page {
    padding: 1rem;
  }

  .meeting-form {
    padding: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .btn {
    width: 100%;
    text-align: center;
  }
}
</style>
