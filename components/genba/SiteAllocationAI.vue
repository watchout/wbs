<template>
  <div class="site-allocation-ai">
    <!-- ヘッダー -->
    <div class="ai-header">
      <div class="ai-title">
        <span class="ai-icon">🤖</span>
        <h3>AI現場配置アシスタント</h3>
      </div>
      <div class="ai-period">
        <label class="period-label">対象期間</label>
        <div class="period-inputs">
          <input
            v-model="localWeekStart"
            type="date"
            class="period-input"
            :disabled="loading"
          />
          <span class="period-sep">〜</span>
          <input
            v-model="localWeekEnd"
            type="date"
            class="period-input"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <!-- アクションボタン -->
    <div class="ai-actions">
      <button
        class="btn btn-ai-propose"
        :disabled="loading || confirming"
        @click="handleRequestProposal"
      >
        <span v-if="loading" class="spinner">⏳</span>
        <span v-else>✨</span>
        {{ loading ? 'AIが分析中...' : 'AIに現場配置を提案させる' }}
      </button>
      <button
        v-if="result"
        class="btn btn-secondary"
        :disabled="loading || confirming"
        @click="reset"
      >
        リセット
      </button>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="ai-error">
      <span>⚠️ {{ error }}</span>
    </div>

    <!-- AI返答（rawReply） -->
    <div v-if="result" class="ai-result">
      <!-- AI説明テキスト -->
      <div class="ai-reply-text">
        <h4>AIの分析結果</h4>
        <p class="reply-text">{{ result.rawReply }}</p>
        <p v-if="result.creditsRemaining !== null" class="credits-info">
          残クレジット: {{ result.creditsRemaining }}
        </p>
      </div>

      <!-- 提案テーブル（proposals がある場合） -->
      <div v-if="result.proposals.length > 0" class="proposals-section">
        <h4>配置提案テーブル</h4>
        <div class="proposals-table-wrapper">
          <table class="proposals-table">
            <thead>
              <tr>
                <th>現場</th>
                <th>日付</th>
                <th>必要人数</th>
                <th>推奨担当者</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(proposal, idx) in result.proposals" :key="idx">
                <td class="site-name">{{ proposal.siteName }}</td>
                <td class="date-cell">{{ proposal.date }}</td>
                <td class="count-cell">{{ proposal.requiredCount }}名</td>
                <td class="candidates-cell">
                  <div class="candidate-list">
                    <span
                      v-for="(candidate, cIdx) in proposal.candidates.slice(0, proposal.requiredCount)"
                      :key="cIdx"
                      class="candidate-tag"
                    >
                      {{ candidate.name }}
                      <span v-if="candidate.department" class="candidate-dept">
                        ({{ candidate.department }})
                      </span>
                    </span>
                    <span
                      v-if="proposal.candidates.length === 0"
                      class="no-candidate"
                    >
                      候補なし
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 確定ボタン -->
        <div class="confirm-section">
          <div v-if="confirmSuccess" class="confirm-success">
            ✅ 配置を確定しました
          </div>
          <div v-else-if="confirmError" class="confirm-error">
            ⚠️ {{ confirmError }}
          </div>
          <button
            v-if="!confirmSuccess"
            class="btn btn-confirm"
            :disabled="loading || confirming || result.proposals.length === 0"
            @click="handleConfirmProposals"
          >
            <span v-if="confirming" class="spinner">⏳</span>
            {{ confirming ? '確定中...' : 'この提案を確定する' }}
          </button>
          <p class="confirm-note">
            ※ 確定すると選択された担当者のスケジュールに現場配置が追加されます
          </p>
        </div>
      </div>

      <!-- proposals が空の場合のフォールバック -->
      <div v-else class="no-proposals">
        <p>構造化された提案データが取得できませんでした。上記の分析テキストをご参照ください。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAISiteAllocation, type AssignmentRequest } from '~/composables/useAISiteAllocation'

// ===== Props =====
const props = defineProps<{
  week: {
    start: string  // YYYY-MM-DD
    end: string    // YYYY-MM-DD
  }
}>()

// ===== Composable =====
const {
  loading,
  error,
  result,
  confirming,
  confirmError,
  confirmSuccess,
  requestProposal,
  confirmProposals,
  reset,
} = useAISiteAllocation()

// ===== ローカル状態 =====
const localWeekStart = ref(props.week.start)
const localWeekEnd = ref(props.week.end)

// week prop が変わったら同期
watch(
  () => props.week,
  (newWeek) => {
    localWeekStart.value = newWeek.start
    localWeekEnd.value = newWeek.end
  },
  { deep: true }
)

// ===== ハンドラー =====
async function handleRequestProposal(): Promise<void> {
  reset()
  await requestProposal(localWeekStart.value, localWeekEnd.value)
}

async function handleConfirmProposals(): Promise<void> {
  if (!result.value || result.value.proposals.length === 0) return

  // 提案の先頭候補を配置リストに変換
  const assignments: AssignmentRequest[] = []
  for (const proposal of result.value.proposals) {
    const topCandidates = proposal.candidates.slice(0, proposal.requiredCount)
    for (const candidate of topCandidates) {
      assignments.push({
        userId: candidate.userId,
        siteName: proposal.siteName,
        date: proposal.date,
      })
    }
  }

  await confirmProposals(assignments)
}
</script>

<style scoped>
.site-allocation-ai {
  background: #f8f9ff;
  border: 1px solid #d0d7ff;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ai-icon {
  font-size: 1.4rem;
}

.ai-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #3d3d8f;
}

.ai-period {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.period-label {
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
}

.period-inputs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.period-input {
  padding: 0.3rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.85rem;
}

.period-sep {
  color: #666;
  font-size: 0.85rem;
}

/* アクション */
.ai-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ai-propose {
  background: linear-gradient(135deg, #5b6cf8, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-ai-propose:hover:not(:disabled) {
  background: linear-gradient(135deg, #4a5ce8, #7a4ce0);
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #d0d0d0;
}

.btn-confirm {
  background: #2d9a4e;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-confirm:hover:not(:disabled) {
  background: #248040;
}

/* エラー */
.ai-error {
  background: #fff3f3;
  border: 1px solid #ffcdd2;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #c62828;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

/* 結果 */
.ai-result {
  border-top: 1px solid #dde;
  padding-top: 1rem;
}

.ai-reply-text h4,
.proposals-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: #3d3d8f;
}

.reply-text {
  font-size: 0.9rem;
  color: #333;
  line-height: 1.7;
  white-space: pre-wrap;
  background: white;
  border: 1px solid #e0e0ff;
  border-radius: 6px;
  padding: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 0.5rem;
}

.credits-info {
  font-size: 0.8rem;
  color: #888;
  margin-bottom: 1rem;
}

/* 提案テーブル */
.proposals-section {
  margin-top: 1rem;
}

.proposals-table-wrapper {
  overflow-x: auto;
  margin-bottom: 1rem;
}

.proposals-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  background: white;
  border: 1px solid #e0e0ff;
  border-radius: 6px;
  overflow: hidden;
}

.proposals-table th {
  background: #eef0ff;
  color: #3d3d8f;
  font-weight: 600;
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #d0d7ff;
  white-space: nowrap;
}

.proposals-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f0f0ff;
  vertical-align: top;
}

.proposals-table tr:last-child td {
  border-bottom: none;
}

.proposals-table tr:hover td {
  background: #fafbff;
}

.site-name {
  font-weight: 500;
  color: #333;
}

.date-cell {
  color: #555;
  white-space: nowrap;
}

.count-cell {
  text-align: center;
  color: #333;
}

.candidate-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.candidate-tag {
  background: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 12px;
  padding: 0.2rem 0.6rem;
  font-size: 0.82rem;
  color: #2e7d32;
  white-space: nowrap;
}

.candidate-dept {
  color: #81c784;
  font-size: 0.78rem;
}

.no-candidate {
  color: #ef5350;
  font-size: 0.85rem;
}

/* 確定セクション */
.confirm-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.confirm-success {
  color: #2e7d32;
  font-weight: 500;
  font-size: 0.9rem;
}

.confirm-error {
  color: #c62828;
  font-size: 0.9rem;
}

.confirm-note {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
}

.no-proposals {
  font-size: 0.9rem;
  color: #666;
  background: white;
  border: 1px dashed #ccc;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
}

.spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* レスポンシブ */
@media (max-width: 640px) {
  .ai-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .period-inputs {
    flex-wrap: wrap;
  }

  .period-input {
    width: 130px;
  }
}
</style>
