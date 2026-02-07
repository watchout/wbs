<template>
  <div class="platform-credit-packs">
    <div class="page-actions">
      <button class="btn btn-primary" @click="showAddForm = true">
        + パックを追加
      </button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

    <div v-if="loading" class="loading">読み込み中...</div>

    <div v-else class="packs-table-container">
      <table class="packs-table">
        <thead>
          <tr>
            <th>パック名</th>
            <th>クレジット数</th>
            <th>価格（税抜）</th>
            <th>Stripe Price ID</th>
            <th>表示順</th>
            <th>有効</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pack in creditPacks" :key="pack.id" :class="{ inactive: !pack.isActive }">
            <td>
              <input
                v-model="pack.name"
                class="inline-input"
                @blur="savePack(pack)"
              />
            </td>
            <td>
              <input
                type="number"
                v-model.number="pack.credits"
                class="inline-input number"
                @blur="savePack(pack)"
              />
            </td>
            <td>
              <div class="price-cell">
                <span>¥</span>
                <input
                  type="number"
                  v-model.number="pack.price"
                  class="inline-input number"
                  @blur="savePack(pack)"
                />
              </div>
            </td>
            <td>
              <input
                v-model="pack.stripePriceId"
                class="inline-input"
                placeholder="未設定"
                @blur="savePack(pack)"
              />
            </td>
            <td>
              <input
                type="number"
                v-model.number="pack.sortOrder"
                class="inline-input number small"
                @blur="savePack(pack)"
              />
            </td>
            <td>
              <input
                type="checkbox"
                :checked="pack.isActive"
                @change="toggleActive(pack)"
              />
            </td>
            <td>
              <button class="btn-icon delete" @click="confirmDelete(pack)" title="削除">
                delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 追加フォーム モーダル -->
    <div v-if="showAddForm" class="modal-overlay" @click.self="showAddForm = false">
      <div class="modal-content">
        <h3>クレジットパックを追加</h3>

        <div class="form-field">
          <label>パック名</label>
          <input v-model="newPack.name" type="text" placeholder="例: スタンダード" />
        </div>

        <div class="form-field">
          <label>クレジット数</label>
          <input v-model.number="newPack.credits" type="number" placeholder="300" />
        </div>

        <div class="form-field">
          <label>価格（税抜・円）</label>
          <input v-model.number="newPack.price" type="number" placeholder="3500" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAddForm = false">キャンセル</button>
          <button class="btn btn-primary" @click="addPack" :disabled="adding">追加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'platform' as 'default',  // platform layout added - needs nuxt prepare
  middleware: 'platformAdmin' as 'auth',  // platformAdmin middleware added - needs nuxt prepare
})

const loading = ref(true)
const error = ref('')
const successMessage = ref('')
const showAddForm = ref(false)
const adding = ref(false)

interface CreditPackConfig {
  id: string
  name: string
  credits: number
  price: number
  stripePriceId: string | null
  sortOrder: number
  isActive: boolean
}

const creditPacks = ref<CreditPackConfig[]>([])

const newPack = ref({
  name: '',
  credits: 100,
  price: 1000,
})

async function fetchPacks() {
  loading.value = true
  try {
    const res = await $fetch('/api/platform/credit-packs')
    creditPacks.value = (res as { creditPacks: CreditPackConfig[] }).creditPacks
  } catch (e) {
    error.value = 'クレジットパックの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

async function savePack(pack: CreditPackConfig) {
  error.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/platform/credit-packs/${pack.id}`, {
      method: 'PATCH',
      body: {
        name: pack.name,
        credits: pack.credits,
        price: pack.price,
        stripePriceId: pack.stripePriceId,
        sortOrder: pack.sortOrder,
        isActive: pack.isActive,
      },
    })
    successMessage.value = '保存しました'
    setTimeout(() => { successMessage.value = '' }, 2000)
  } catch (e) {
    error.value = '保存に失敗しました'
  }
}

async function toggleActive(pack: CreditPackConfig) {
  pack.isActive = !pack.isActive
  await savePack(pack)
}

async function addPack() {
  if (!newPack.value.name) {
    error.value = 'パック名は必須です'
    return
  }

  adding.value = true
  error.value = ''
  try {
    await $fetch('/api/platform/credit-packs', {
      method: 'POST',
      body: newPack.value,
    })
    showAddForm.value = false
    newPack.value = { name: '', credits: 100, price: 1000 }
    await fetchPacks()
    successMessage.value = 'パックを追加しました'
    setTimeout(() => { successMessage.value = '' }, 2000)
  } catch (e) {
    error.value = '追加に失敗しました'
  } finally {
    adding.value = false
  }
}

function confirmDelete(pack: CreditPackConfig) {
  // 実際にはソフトデリートまたは無効化のみ
  if (confirm(`「${pack.name}」を無効にしますか？`)) {
    pack.isActive = false
    savePack(pack)
  }
}

onMounted(fetchPacks)
</script>

<style scoped>
.platform-credit-packs {
  max-width: 1200px;
}

.page-actions {
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #64748b;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.success-message {
  background: #f0fdf4;
  color: #16a34a;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.packs-table-container {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.packs-table {
  width: 100%;
  border-collapse: collapse;
}

.packs-table th {
  text-align: left;
  padding: 14px 16px;
  background: #f8fafc;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  border-bottom: 1px solid #e2e8f0;
}

.packs-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
  color: #1e293b;
}

.packs-table tr.inactive td {
  opacity: 0.5;
}

.inline-input {
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #1e293b;
  width: 100%;
}

.inline-input:focus {
  border-color: #3b82f6;
  background: #f8fafc;
  outline: none;
}

.inline-input.number {
  width: 100px;
}

.inline-input.number.small {
  width: 60px;
}

.price-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 18px;
  color: #64748b;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f1f5f9;
}

.btn-icon.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* ボタン */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
}

.modal-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-field input:focus {
  border-color: #3b82f6;
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
