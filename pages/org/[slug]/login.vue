<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>ミエルボード for 現場</h1>
        <p class="org-name">{{ organization?.name || slug }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input 
            id="email"
            v-model="email" 
            type="email" 
            placeholder="your@email.com"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>
      </form>

      <div class="login-footer">
        <p class="hint">メールアドレスを入力してログイン</p>
        <div class="divider"></div>
        <NuxtLink :to="`/org/${slug}/device-login`" class="device-login-link">
          📺 サイネージ/ホワイトボードの接続
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: 'blank',
})

interface Organization {
  id: string
  name: string
  slug: string
}

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

const email = ref('')
const loading = ref(false)
const error = ref('')
const organization = ref<Organization | null>(null)

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        organizationSlug: slug.value
      }
    })

    // 成功時は週間ボードへリダイレクト
    router.push(`/org/${slug.value}/weekly-board`)
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    error.value = fetchError.data?.message || 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}

// 組織情報の取得（オプション）
onMounted(async () => {
  try {
    // TODO: 組織情報取得API
    // const org = await $fetch(`/api/org/${slug.value}`)
    // organization.value = org
  } catch {
    // 組織が見つからない場合はエラー表示
  }
})

useHead({
  title: 'ログイン'
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  font-size: 1.5rem;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
}

.org-name {
  color: #666;
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #1a73e8;
}

.form-group input:disabled {
  background: #f5f5f5;
}

.error-message {
  color: #d93025;
  font-size: 0.85rem;
  padding: 0.75rem;
  background: #ffeaea;
  border-radius: 8px;
}

.btn-primary {
  padding: 0.875rem 1.5rem;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #1557b0;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.hint {
  color: #666;
  font-size: 0.85rem;
  margin: 0;
}

.divider {
  height: 1px;
  background: #eee;
  margin: 1rem 0;
}

.device-login-link {
  display: block;
  color: #666;
  text-decoration: none;
  font-size: 0.85rem;
  padding: 0.5rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.device-login-link:hover {
  background: #f5f5f5;
  text-decoration: none;
}
</style>

