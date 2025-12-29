<template>
  <div class="device-login-page">
    <div class="device-login-card">
      <div class="login-header">
        <div class="logo-icon">📺</div>
        <h1>ミエルボード</h1>
        <p class="subtitle">サイネージ / ホワイトボード</p>
        <p class="org-name">{{ slug }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="deviceKey">デバイスキー</label>
          <input 
            id="deviceKey"
            v-model="deviceKey" 
            type="password" 
            placeholder="デバイスキーを入力"
            required
            :disabled="loading"
            autocomplete="off"
          />
          <p class="hint">管理者から発行されたキーを入力してください</p>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? '接続中...' : 'ボードに接続' }}
        </button>
      </form>

      <div class="login-footer">
        <NuxtLink :to="`/org/${slug}/login`" class="switch-login">
          社員ログインはこちら
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

const deviceKey = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/auth/device-login', {
      method: 'POST',
      body: {
        deviceKey: deviceKey.value,
        organizationSlug: slug.value
      }
    })

    if (response.success) {
      // サイネージモードで週間ボードを開く
      router.push(`/org/${slug.value}/weekly-board?fullscreen=true`)
    }
  } catch (err: any) {
    error.value = err.data?.message || 'デバイスキーが正しくありません'
  } finally {
    loading.value = false
  }
}

useHead({
  title: 'デバイスログイン'
})
</script>

<style scoped>
.device-login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
  padding: 1rem;
}

.device-login-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 3rem;
  width: 100%;
  max-width: 420px;
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.login-header h1 {
  font-size: 1.75rem;
  color: #fff;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.org-name {
  color: #4ecdc4;
  font-size: 1rem;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.form-group input {
  padding: 1rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  transition: border-color 0.2s, background 0.2s;
  text-align: center;
  letter-spacing: 0.2em;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: normal;
}

.form-group input:focus {
  outline: none;
  border-color: #4ecdc4;
  background: rgba(255, 255, 255, 0.15);
}

.form-group input:disabled {
  opacity: 0.5;
}

.hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.error-message {
  color: #ff6b6b;
  font-size: 0.85rem;
  padding: 0.75rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  text-align: center;
}

.btn-primary {
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  color: #0f0f23;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(78, 205, 196, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-footer {
  margin-top: 2rem;
  text-align: center;
}

.switch-login {
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
}

.switch-login:hover {
  color: #fff;
}
</style>




