<template>
  <div class="sites-admin">
    <div class="page-header">
      <h1>現場管理</h1>
      <button class="btn-primary" @click="showCreateModal = true">新規作成</button>
    </div>

    <!-- フィルター -->
    <div class="filter-bar">
      <select v-model="statusFilter" class="filter-select">
        <option value="">すべて</option>
        <option value="ACTIVE">稼働中</option>
        <option value="INACTIVE">休止中</option>
        <option value="COMPLETED">完了</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="現場名・住所・顧客名で検索..."
        class="filter-search"
        @input="debouncedFetch"
      />
    </div>

    <!-- サイト一覧テーブル -->
    <table class="sites-table">
      <thead>
        <tr>
          <th>現場名</th>
          <th>住所</th>
          <th>顧客名</th>
          <th>状態</th>
          <th>工期</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="site in sites" :key="site.id">
          <td class="site-name">{{ site.name }}</td>
          <td>{{ site.address || '-' }}</td>
          <td>{{ site.clientName || '-' }}</td>
          <td>
            <span class="status-badge" :class="getStatusClass(site.status)">
              {{ getStatusLabel(site.status) }}
            </span>
          </td>
          <td class="period-cell">
            <template v-if="site.startDate || site.endDate">
              {{ formatDateShort(site.startDate) }} 〜 {{ formatDateShort(site.endDate) }}
            </template>
            <template v-else>-</template>
          </td>
          <td class="actions-cell">
            <button class="btn-sm btn-edit" @click="openEditModal(site)">編集</button>
            <button class="btn-sm btn-delete" @click="confirmDelete(site)">削除</button>
          </td>
        </tr>
        <tr v-if="sites.length === 0">
          <td colspan="6" class="no-data">
            {{ loading ? '読み込み中...' : '現場データがありません' }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 作成/編集モーダル -->
    <div v-if="showCreateModal || editingSite" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ editingSite ? '現場を編集' : '新しい現場を作成' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>現場名 <span class="required">*</span></label>
            <input v-model="form.name" type="text" maxlength="100" required />
          </div>
          <div class="form-group">
            <label>住所</label>
            <input v-model="form.address" type="text" />
          </div>
          <div class="form-group">
            <label>顧客名</label>
            <input v-model="form.clientName" type="text" />
          </div>
          <div class="form-group">
            <label>状態</label>
            <select v-model="form.status">
              <option value="ACTIVE">稼働中</option>
              <option value="INACTIVE">休止中</option>
              <option value="COMPLETED">完了</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>工期開始</label>
              <input v-model="form.startDate" type="date" />
            </div>
            <div class="form-group">
              <label>工期終了</label>
              <input v-model="form.endDate" type="date" />
            </div>
          </div>
          <div class="form-group">
            <label>備考</label>
            <textarea v-model="form.note" rows="3" />
          </div>

          <div v-if="formError" class="form-error">{{ formError }}</div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">キャンセル</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Site {
  id: string
  name: string
  address: string | null
  clientName: string | null
  status: string
  startDate: string | null
  endDate: string | null
  note: string | null
}

const sites = ref<Site[]>([])
const loading = ref(false)
const statusFilter = ref('')
const searchQuery = ref('')
const showCreateModal = ref(false)
const editingSite = ref<Site | null>(null)
const submitting = ref(false)
const formError = ref('')

const form = ref({
  name: '',
  address: '',
  clientName: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
  note: '',
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchSites(), 300)
}

async function fetchSites() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (statusFilter.value) params.append('status', statusFilter.value)
    if (searchQuery.value) params.append('search', searchQuery.value)

    const response = await $fetch<{ success: boolean; data: Site[] }>(
      `/api/sites?${params}`
    )
    if (response.success) {
      sites.value = response.data
    }
  } catch {
    // エラーハンドリング
  } finally {
    loading.value = false
  }
}

function openEditModal(site: Site) {
  editingSite.value = site
  form.value = {
    name: site.name,
    address: site.address || '',
    clientName: site.clientName || '',
    status: site.status,
    startDate: site.startDate ? site.startDate.split('T')[0] : '',
    endDate: site.endDate ? site.endDate.split('T')[0] : '',
    note: site.note || '',
  }
  formError.value = ''
}

function closeModal() {
  showCreateModal.value = false
  editingSite.value = null
  formError.value = ''
  form.value = {
    name: '',
    address: '',
    clientName: '',
    status: 'ACTIVE',
    startDate: '',
    endDate: '',
    note: '',
  }
}

async function handleSubmit() {
  submitting.value = true
  formError.value = ''

  try {
    const payload = {
      name: form.value.name,
      address: form.value.address || null,
      clientName: form.value.clientName || null,
      status: form.value.status,
      startDate: form.value.startDate || null,
      endDate: form.value.endDate || null,
      note: form.value.note || null,
    }

    if (editingSite.value) {
      await $fetch(`/api/sites/${editingSite.value.id}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/sites', {
        method: 'POST',
        body: payload,
      })
    }

    closeModal()
    await fetchSites()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    formError.value = error.data?.message || '保存に失敗しました'
  } finally {
    submitting.value = false
  }
}

async function confirmDelete(site: Site) {
  if (!confirm(`「${site.name}」を削除しますか？`)) return

  try {
    await $fetch(`/api/sites/${site.id}`, { method: 'DELETE' })
    await fetchSites()
  } catch {
    alert('削除に失敗しました')
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: '稼働中',
    INACTIVE: '休止中',
    COMPLETED: '完了',
  }
  return labels[status] || status
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    ACTIVE: 'status-active',
    INACTIVE: 'status-inactive',
    COMPLETED: 'status-completed',
  }
  return classes[status] || ''
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

watch(statusFilter, () => fetchSites())

onMounted(() => fetchSites())
</script>

<style scoped>
.sites-admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: bold;
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.filter-search {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sites-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sites-table th,
.sites-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.sites-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.85rem;
  color: #555;
}

.site-name {
  font-weight: 600;
}

.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-active { background: #dcfce7; color: #16a34a; }
.status-inactive { background: #f3f4f6; color: #6b7280; }
.status-completed { background: #dbeafe; color: #2563eb; }

.period-cell {
  font-size: 0.85rem;
  white-space: nowrap;
}

.actions-cell {
  white-space: nowrap;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.25rem;
}

.btn-edit { background: #e0f2fe; color: #0369a1; }
.btn-delete { background: #fee2e2; color: #dc2626; }

.no-data {
  text-align: center;
  color: #888;
  padding: 2rem !important;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  font-size: 1.25rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: #374151;
}

.required { color: #dc2626; }

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-error {
  color: #dc2626;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
</style>
