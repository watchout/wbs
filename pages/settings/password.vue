<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="page-title">パスワード変更</h1>

      <form @submit.prevent="handleSubmit" class="settings-form">
        <!-- Current Password -->
        <div class="form-group">
          <label for="currentPassword" class="form-label">現在のパスワード</label>
          <input
            id="currentPassword"
            v-model="form.currentPassword"
            type="password"
            class="form-input"
            placeholder="現在のパスワードを入力"
            autocomplete="current-password"
          />
          <p v-if="errors.currentPassword" class="form-error">{{ errors.currentPassword }}</p>
        </div>

        <!-- New Password -->
        <div class="form-group">
          <label for="newPassword" class="form-label">新しいパスワード</label>
          <input
            id="newPassword"
            v-model="form.newPassword"
            type="password"
            class="form-input"
            placeholder="新しいパスワードを入力（8文字以上）"
            autocomplete="new-password"
          />
          <p v-if="errors.newPassword" class="form-error">{{ errors.newPassword }}</p>
          <p class="form-hint">8文字以上で入力してください</p>
        </div>

        <!-- Confirm New Password -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">新しいパスワード（確認）</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            class="form-input"
            placeholder="新しいパスワードを再入力"
            autocomplete="new-password"
          />
          <p v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</p>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="submitting"
          >
            {{ submitting ? '変更中...' : 'パスワードを変更' }}
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const router = useRouter()

const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Check authentication
async function checkAuth() {
  try {
    const response = await $fetch<{ isAuthenticated: boolean }>('/api/auth/me')
    if (!response.isAuthenticated) {
      router.push('/login')
    }
  } catch {
    router.push('/login')
  }
}

function validate(): boolean {
  errors.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }

  let isValid = true

  if (!form.value.currentPassword) {
    errors.value.currentPassword = '現在のパスワードを入力してください'
    isValid = false
  }

  if (!form.value.newPassword) {
    errors.value.newPassword = '新しいパスワードを入力してください'
    isValid = false
  } else if (form.value.newPassword.length < 8) {
    errors.value.newPassword = 'パスワードは8文字以上で入力してください'
    isValid = false
  }

  if (!form.value.confirmPassword) {
    errors.value.confirmPassword = '確認用パスワードを入力してください'
    isValid = false
  } else if (form.value.newPassword !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'パスワードが一致しません'
    isValid = false
  }

  return isValid
}

async function handleSubmit() {
  successMessage.value = ''
  errorMessage.value = ''

  if (!validate()) {
    return
  }

  submitting.value = true
  try {
    const response = await $fetch<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: form.value.currentPassword,
        newPassword: form.value.newPassword
      }
    })

    if (response.success) {
      successMessage.value = response.message || 'パスワードを変更しました'
      // Clear form
      form.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
  } catch (error: any) {
    errorMessage.value = error.data?.statusMessage || 'パスワードの変更に失敗しました'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  checkAuth()
})

useHead({
  title: 'パスワード変更'
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
