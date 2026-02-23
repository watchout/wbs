<template>
  <Teleport to="body">
    <div v-if="visible" class="otp-overlay" @click.self="cancel">
      <div class="otp-modal">
        <h2>認証コードの入力</h2>

        <!-- ステップ1: コード送信前 -->
        <div v-if="step === 'send'">
          <p class="otp-desc">
            セキュリティ確認のため、登録メールアドレスに認証コードを送信します。
          </p>
          <button class="btn btn-primary" :disabled="sending" @click="sendCode">
            {{ sending ? '送信中...' : '認証コードを送信' }}
          </button>
        </div>

        <!-- ステップ2: コード入力 -->
        <div v-if="step === 'verify'">
          <p class="otp-desc">
            メールに送信された6桁のコードを入力してください。
          </p>
          <div class="otp-input-group">
            <input
              ref="codeInput"
              v-model="code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              pattern="\d{6}"
              placeholder="000000"
              class="otp-code-input"
              :disabled="verifying"
              @keyup.enter="verify"
            />
          </div>
          <div v-if="errorMsg" class="otp-error">{{ errorMsg }}</div>
          <div class="otp-actions">
            <button class="btn btn-primary" :disabled="verifying || code.length !== 6" @click="verify">
              {{ verifying ? '確認中...' : '確認' }}
            </button>
            <button class="btn btn-link" :disabled="resendCooldown > 0 || sending" @click="sendCode">
              {{ resendCooldown > 0 ? `再送信 (${resendCooldown}s)` : '再送信' }}
            </button>
          </div>
        </div>

        <button class="otp-close" @click="cancel" aria-label="閉じる">&times;</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCsrf } from '~/composables/useCsrf'

const { csrfFetch } = useCsrf()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'verified'): void
  (e: 'cancel'): void
}>()

const step = ref<'send' | 'verify'>('send')
const code = ref('')
const sending = ref(false)
const verifying = ref(false)
const errorMsg = ref('')
const resendCooldown = ref(0)
const codeInput = ref<HTMLInputElement | null>(null)

let cooldownTimer: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (val) => {
  if (val) {
    step.value = 'send'
    code.value = ''
    errorMsg.value = ''
    resendCooldown.value = 0
  }
})

async function sendCode() {
  sending.value = true
  errorMsg.value = ''
  try {
    await csrfFetch('/api/auth/otp/send', { method: 'POST' })
    step.value = 'verify'
    startCooldown()
    nextTick(() => codeInput.value?.focus())
  } catch (err: unknown) {
    const message = (err as { data?: { message?: string } })?.data?.message
    errorMsg.value = message || '送信に失敗しました'
  } finally {
    sending.value = false
  }
}

async function verify() {
  if (code.value.length !== 6) return
  verifying.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/auth/otp/verify', {
      method: 'POST',
      body: { code: code.value },
    })
    emit('verified')
  } catch (err: unknown) {
    const message = (err as { data?: { message?: string } })?.data?.message
    errorMsg.value = message || '認証に失敗しました'
    code.value = ''
    codeInput.value?.focus()
  } finally {
    verifying.value = false
  }
}

function cancel() {
  emit('cancel')
}

function startCooldown() {
  resendCooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<style scoped>
.otp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.otp-modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.otp-modal h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 16px;
  color: #1a1a2e;
}

.otp-desc {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 20px;
}

.otp-input-group {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.otp-code-input {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 8px;
  text-align: center;
  width: 200px;
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.otp-code-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.otp-error {
  color: #dc2626;
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 12px;
}

.otp-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.otp-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.otp-close:hover {
  color: #374151;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-link {
  background: none;
  color: #3b82f6;
  padding: 4px 8px;
  font-size: 0.8rem;
}

.btn-link:hover:not(:disabled) {
  text-decoration: underline;
}
</style>
