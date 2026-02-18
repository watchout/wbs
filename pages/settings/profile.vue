<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="page-title">プロフィール設定</h1>

      <div v-if="loading" class="loading">読み込み中...</div>

      <form v-else @submit.prevent="handleSubmit" class="settings-form">
        <!-- Name (editable) -->
        <div class="form-group">
          <label for="name" class="form-label">名前</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="名前を入力"
            maxlength="100"
          />
          <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
        </div>

        <!-- Email (read-only) -->
        <div class="form-group">
          <label class="form-label">メールアドレス</label>
          <div class="form-readonly">{{ user?.email || '-' }}</div>
          <p class="form-hint">メールアドレスは変更できません</p>
        </div>

        <!-- Role (read-only) -->
        <div class="form-group">
          <label class="form-label">権限</label>
          <div class="form-readonly">
            <span class="role-badge" :class="roleClass">{{ roleLabel }}</span>
          </div>
        </div>

        <!-- Department (read-only) -->
        <div class="form-group">
          <label class="form-label">所属部署</label>
          <div class="form-readonly">{{ user?.department?.name || '未所属' }}</div>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="submitting"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>

        <!-- Success/Error messages -->
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

interface UserInfo {
  id: string
  name: string | null
  email: string
  role: string
  department?: {
    id: string
    name: string
  } | null
}

interface MeResponse {
  success: boolean
  user: UserInfo | null
  isAuthenticated: boolean
}

const router = useRouter()

const user = ref<UserInfo | null>(null)
const loading = ref(true)
const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const form = ref({
  name: ''
})

const errors = ref({
  name: ''
})

// Computed
const roleClass = computed(() => {
  const role = user.value?.role
  return {
    'role-admin': role === 'ADMIN',
    'role-leader': role === 'LEADER',
    'role-member': role === 'MEMBER'
  }
})

const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    ADMIN: '管理者',
    LEADER: 'リーダー',
    MEMBER: '一般'
  }
  return roleMap[user.value?.role || ''] || '一般'
})

// Methods
async function fetchUser() {
  loading.value = true
  try {
    const response = await $fetch<MeResponse>('/api/auth/me')
    if (response.success && response.user) {
      user.value = response.user
      form.value.name = response.user.name || ''
    } else {
      router.push('/login')
    }
  } catch {
    router.push('/login')
  } finally {
    loading.value = false
  }
}

function validate(): boolean {
  errors.value.name = ''

  const trimmedName = form.value.name.trim()
  if (!trimmedName) {
    errors.value.name = '名前を入力してください'
    return false
  }
  if (trimmedName.length > 100) {
    errors.value.name = '名前は100文字以内で入力してください'
    return false
  }

  return true
}

async function handleSubmit() {
  successMessage.value = ''
  errorMessage.value = ''

  if (!validate()) {
    return
  }

  submitting.value = true
  try {
    const response = await $fetch<{ success: boolean; user: UserInfo }>('/api/users/me', {
      method: 'PATCH',
      body: {
        name: form.value.name.trim()
      }
    })

    if (response.success) {
      user.value = { ...user.value, ...response.user } as UserInfo
      successMessage.value = 'プロフィールを更新しました'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
  } catch (error: unknown) {
    const errData = error && typeof error === 'object' && 'data' in error ? (error as Record<string, unknown>).data as Record<string, unknown> | undefined : undefined
    errorMessage.value = (errData?.statusMessage as string) || '更新に失敗しました'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchUser()
})

useHead({
  title: 'プロフィール設定'
})
</script>

<style scoped>
.settings-page {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.settings-container {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary, #1a73e8);
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
}

.form-readonly {
  padding: 0.75rem 1rem;
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 6px;
  color: #666;
}

.form-hint {
  font-size: 0.8rem;
  color: #888;
}

.form-error {
  font-size: 0.85rem;
  color: var(--color-error, #d93025);
}

.form-actions {
  margin-top: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary, #1a73e8);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.role-badge {
  display: inline-block;
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  color: #fff;
}

.role-admin {
  background: #1a73e8;
}

.role-leader {
  background: #388e3c;
}

.role-member {
  background: #666;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.alert-success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.alert-error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

@media (max-width: 640px) {
  .settings-page {
    padding: 1rem;
  }

  .settings-container {
    padding: 1.5rem;
  }
}
</style>
