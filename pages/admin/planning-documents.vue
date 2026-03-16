<template>
  <div class="planning-documents-page">
    <div class="page-header">
      <h1>工程表管理</h1>
      <p class="subtitle">工程表をアップロードしてAIで自動解析します</p>
    </div>

    <div class="content">
      <!-- アップロードエリア -->
      <section class="upload-section card">
        <h2>ステップ 1: 工程表をアップロード</h2>
        <div
          class="upload-area"
          @drop.prevent="handleDrop"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          :class="{ 'is-dragging': isDragging }"
        >
          <div class="upload-content">
            <Icon name="carbon:cloud-upload" size="48" class="upload-icon" />
            <p class="drag-text">
              ファイルをドラッグ&ドロップするか、クリックして選択
            </p>
            <input
              ref="fileInput"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              @change="handleFileSelect"
              class="file-input"
              aria-label="工程表ファイル選択"
            />
            <button type="button" @click="$refs.fileInput?.click()" class="btn btn-primary">
              ファイルを選択
            </button>
            <p class="file-info">
              対応形式: PDF, JPEG, PNG, GIF, WebP (最大 10MB)
            </p>
          </div>
        </div>

        <!-- アップロード進度 -->
        <div v-if="uploadProgress > 0" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
          </div>
          <p class="progress-text">{{ uploadProgress }}%</p>
        </div>

        <!-- エラーメッセージ -->
        <div v-if="uploadError" class="error-message">
          <Icon name="carbon:warning-fill" size="20" />
          <span>{{ uploadError }}</span>
          <button type="button" @click="uploadError = ''" class="btn-close">×</button>
        </div>
      </section>

      <!-- ドキュメント一覧 -->
      <section class="documents-section card">
        <h2>ステップ 2: 解析結果を確認</h2>
        
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>読み込み中...</p>
        </div>

        <div v-else-if="documents.length === 0" class="empty-state">
          <Icon name="carbon:inbox" size="48" />
          <p>工程表がまだアップロードされていません</p>
        </div>

        <div v-else class="documents-list">
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="document-item"
            :class="{ 'is-confirmed': doc.parseStatus === 'CONFIRMED' }"
          >
            <div class="document-header">
              <div class="document-info">
                <h3>{{ doc.fileName }}</h3>
                <p class="file-meta">
                  {{ formatFileSize(doc.fileSize) }} •
                  {{ formatDate(doc.uploadedAt) }}
                </p>
              </div>
              <div class="document-status">
                <span class="status-badge" :class="`status-${doc.parseStatus.toLowerCase()}`">
                  {{ formatStatus(doc.parseStatus) }}
                </span>
                <span v-if="doc.confidence" class="confidence-badge">
                  {{ Math.round(doc.confidence * 100) }}% 信頼度
                </span>
              </div>
            </div>

            <div v-if="doc.summaryText" class="document-summary">
              <p class="summary-preview">{{ truncateSummary(doc.summaryText) }}</p>
            </div>

            <div class="document-actions">
              <button
                v-if="doc.parseStatus === 'PARSED' || doc.parseStatus === 'NEEDS_REVIEW'"
                type="button"
                @click="goToReview(doc.id)"
                class="btn btn-secondary"
              >
                確認画面へ
              </button>
              <button
                v-if="doc.parseStatus === 'CONFIRMED'"
                type="button"
                @click="viewDetails(doc.id)"
                class="btn btn-tertiary"
                disabled
              >
                確定済み
              </button>
              <button
                type="button"
                @click="deleteDocument(doc.id)"
                class="btn btn-danger"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '~icons/carbon/cloud-upload'

interface PlanningDocument {
  id: string
  fileName: string
  fileSize: number
  parseStatus: string
  uploadedAt: string
  confidence?: number
  summaryText?: string
}

const router = useRouter()
const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')
const loading = ref(false)
const documents = ref<PlanningDocument[]>([])

// ファイル選択（クリック）
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files?.[0]) {
    uploadFile(files[0])
  }
}

// ファイル選択（ドラッグ&ドロップ）
const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (files?.[0]) {
    uploadFile(files[0])
  }
}

// ファイルアップロード
const uploadFile = async (file: File) => {
  // バリデーション
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    uploadError.value = 'ファイルサイズが大きすぎます（最大 10MB）'
    return
  }

  const validTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ]
  if (!validTypes.includes(file.type)) {
    uploadError.value = '対応していないファイル形式です'
    return
  }

  uploadError.value = ''
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('organizationId', 'org-placeholder') // 実装時は動的に取得

    // アップロード進度シミュレーション
    const progressInterval = setInterval(() => {
      uploadProgress.value = Math.min(uploadProgress.value + 10, 90)
    }, 200)

    const response = await $fetch('/api/planning-documents/parse', {
      method: 'POST',
      body: formData,
    })

    clearInterval(progressInterval)
    uploadProgress.value = 100

    setTimeout(() => {
      uploadProgress.value = 0
      fetchDocuments() // リストを更新
    }, 500)
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : 'アップロードに失敗しました'
    uploadProgress.value = 0
  }
}

// ドキュメント一覧取得
const fetchDocuments = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/planning-documents')
    documents.value = response.data || []
  } catch (error) {
    uploadError.value = 'ドキュメント取得に失敗しました'
  } finally {
    loading.value = false
  }
}

// 確認画面へ遷移
const goToReview = (documentId: string) => {
  router.push(`/admin/planning-documents/${documentId}/review`)
}

// 詳細表示
const viewDetails = (documentId: string) => {
  router.push(`/admin/planning-documents/${documentId}`)
}

// ドキュメント削除
const deleteDocument = async (documentId: string) => {
  if (!confirm('このドキュメントを削除してもよろしいですか？')) {
    return
  }

  try {
    await $fetch(`/api/planning-documents/${documentId}`, {
      method: 'DELETE',
    })
    fetchDocuments()
  } catch (error) {
    uploadError.value = '削除に失敗しました'
  }
}

// ヘルパー関数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP')
}

const formatStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    PARSED: '解析完了',
    NEEDS_REVIEW: '確認待ち',
    CONFIRMED: '確定済み',
    PENDING: '処理中',
    FAILED: '失敗',
  }
  return statusMap[status] || status
}

const truncateSummary = (summary: string, maxLength: number = 200): string => {
  return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary
}

onMounted(() => {
  fetchDocuments()
})
</script>

<style scoped lang="scss">
.planning-documents-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #666;
    font-size: 1rem;
  }
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 2rem;

  h2 {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: #333;
  }
}

// アップロードエリア
.upload-section {
  .upload-area {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 3rem 2rem;
    text-align: center;
    transition: all 0.3s;
    background: #fafafa;
    cursor: pointer;

    &.is-dragging {
      border-color: #0066cc;
      background: #f0f7ff;
    }

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .upload-icon {
      color: #0066cc;
    }

    .drag-text {
      font-size: 1rem;
      color: #333;
      margin: 0;
    }

    .file-input {
      display: none;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;

      &.btn-primary {
        background: #0066cc;
        color: white;

        &:hover {
          background: #0052a3;
        }
      }
    }

    .file-info {
      font-size: 0.875rem;
      color: #999;
      margin: 0;
    }
  }

  .upload-progress {
    margin-top: 2rem;

    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #0066cc, #00a3ff);
        transition: width 0.3s;
      }
    }

    .progress-text {
      text-align: center;
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.5rem;
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding: 1rem;
    background: #fff5f5;
    border-left: 4px solid #ff4444;
    border-radius: 4px;
    color: #cc0000;

    .btn-close {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #cc0000;
    }
  }
}

// ドキュメント一覧
.documents-section {
  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #999;

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f0f0f0;
      border-top: 4px solid #0066cc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    p {
      margin: 0;
      font-size: 1rem;
    }
  }

  .documents-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .document-item {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 1.5rem;
    transition: all 0.2s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &.is-confirmed {
      background: #f5f9ff;
      border-color: #d0e8ff;
    }

    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;

      @media (max-width: 768px) {
        flex-direction: column;
        gap: 1rem;
      }

      .document-info {
        flex: 1;

        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .file-meta {
          font-size: 0.875rem;
          color: #999;
          margin: 0;
        }
      }

      .document-status {
        display: flex;
        gap: 0.5rem;
        align-items: center;

        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;

          &.status-parsed {
            background: #e8f5e9;
            color: #2e7d32;
          }

          &.status-needs_review {
            background: #fff3e0;
            color: #e65100;
          }

          &.status-confirmed {
            background: #c8e6c9;
            color: #1b5e20;
          }

          &.status-pending {
            background: #f3e5f5;
            color: #6a1b9a;
          }

          &.status-failed {
            background: #ffebee;
            color: #c62828;
          }
        }

        .confidence-badge {
          padding: 0.4rem 0.8rem;
          background: #f0f0f0;
          color: #666;
          border-radius: 4px;
          font-size: 0.85rem;
        }
      }
    }

    .document-summary {
      margin-bottom: 1rem;

      .summary-preview {
        margin: 0;
        color: #666;
        font-size: 0.95rem;
        line-height: 1.5;
        max-height: 3em;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
    }

    .document-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;

      .btn {
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 4px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s;

        &.btn-secondary {
          background: #0066cc;
          color: white;

          &:hover {
            background: #0052a3;
          }
        }

        &.btn-tertiary {
          background: #f0f0f0;
          color: #666;
          cursor: not-allowed;
          opacity: 0.6;
        }

        &.btn-danger {
          background: #fff;
          color: #cc0000;
          border: 1px solid #cc0000;

          &:hover {
            background: #ffebee;
          }
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
