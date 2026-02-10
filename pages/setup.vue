<template>
  <div class="setup-page">
    <div class="setup-container">
      <div class="setup-card">
        <h1 class="setup-title">パスワード設定</h1>
        <p class="setup-description">
          {{ isReset ? 'パスワードを再設定してください。' : '初回ログイン用のパスワードを設定してください。' }}
        </p>

        <div v-if="done" class="success-message">
          <p>{{ isReset ? 'パスワードを再設定しました。' : 'パスワードを設定しました。' }}</p>
          <p>ログインページからログインしてください。</p>
          <button class="btn btn-primary" @click="goToLogin">ログインページへ</button>
        </div>

        <div v-else-if="tokenError" class="error-message">
          <p>{{ tokenError }}</p>
          <p>管理者に再度URLの発行を依頼してください。</p>
        </div>

        <form v-else @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="email">メールアドレス</label>
            <input
              id="email"
              :value="email"
              type="email"
              readonly
              class="form-input readonly"
            />
          </div>

          <div class="form-group">
            <label for="password">パスワード</label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              minlength="8"
              placeholder="8文字以上"
              class="form-input"
              :disabled="submitting"
            />
          </div>

          <div class="form-group">
            <label for="passwordConfirm">パスワード（確認）</label>
            <input
              id="passwordConfirm"
              v-model="passwordConfirm"
              type="password"
              required
              minlength="8"
              placeholder="もう一度入力"
              class="form-input"
              :disabled="submitting"
            />
          </div>

          <div v-if="formError" class="error-message">
            {{ formError }}
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            :disabled="submitting"
          >
            {{ submitting ? '設定中...' : 'パスワードを設定' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'default',
  auth: false
})

const route = useRoute()
const router = useRouter()

const email = computed(() => (route.query.email as string) || '')
const token = computed(() => (route.query.token as string) || '')
const isReset = computed(() => route.query.reset === 'true')

const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)
const done = ref(false)
const formError = ref('')
const tokenError = ref('')

function validateParams(): boolean {
  if (!email.value || !token.value) {
    tokenError.value = 'URLが無効です。メールアドレスまたはトークンが不足しています。'
    return false
  }
  return true
}

async function handleSubmit() {
  formError.value = ''

  if (password.value.length < 8) {
    formError.value = 'パスワードは8文字以上で入力してください'
    return
  }

  if (password.value !== passwordConfirm.value) {
    formError.value = 'パスワードが一致しません'
    return
  }

  submitting.value = true

  try {
    await $fetch('/api/auth/set-password', {
      method: 'POST',
      body: {
        email: email.value,
        setupToken: token.value,
        password: password.value
      }
    })

    done.value = true
  } catch (err: unknown) {
    const fetchError = err as { data?: { statusMessage?: string } }
    formError.value = fetchError.data?.statusMessage || 'パスワードの設定に失敗しました'
  } finally {
    submitting.value = false
  }
}

function goToLogin() {
  router.push('/login')
}

onMounted(() => {
  validateParams()
})

useHead({
  title: 'パスワード設定'
})
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
  padding: 1rem;
}

.setup-container {
  width: 100%;
  max-width: 440px;
}

.setup-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.setup-title {
  font-size: 1.5rem;
  color: #1a1a2e;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.setup-description {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  margin: 0 0 1.5rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.4rem;
}

.form-input {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #1a73e8;
}

.form-input.readonly {
  background: #f5f5f5;
  color: #666;
  cursor: not-allowed;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-block {
  width: 100%;
  margin-top: 0.5rem;
}

.error-message {
  color: #d93025;
  font-size: 0.85rem;
  padding: 0.75rem;
  background: #ffeaea;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.success-message {
  text-align: center;
  padding: 1rem;
}

.success-message p {
  margin: 0.5rem 0;
  color: #333;
}

.success-message .btn {
  margin-top: 1rem;
}

@media (max-width: 480px) {
  .setup-card {
    padding: 1.5rem;
  }

  .setup-title {
    font-size: 1.25rem;
  }
}
</style>
