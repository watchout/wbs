#!/usr/bin/env bash
# OPS-003: PostgreSQL バックアップスクリプト
#
# Usage:
#   ./scripts/backup-db.sh                    # 標準バックアップ
#   ./scripts/backup-db.sh /path/to/backup    # 出力先指定
#
# 環境変数:
#   DATABASE_URL  - PostgreSQL接続URL（必須）
#   BACKUP_DIR    - バックアップ保存先（デフォルト: ./backups）
#
# 出力:
#   backups/wbs_YYYYMMDD_HHMMSS.sql.gz

set -euo pipefail

# 設定
BACKUP_DIR="${1:-${BACKUP_DIR:-./backups}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="wbs_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=7

# 色付き出力
info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1" >&2; }

# DATABASE_URL チェック
if [ -z "${DATABASE_URL:-}" ]; then
  error "DATABASE_URL が設定されていません"
  echo "例: export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'"
  exit 1
fi

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR"

info "PostgreSQL バックアップ開始"
info "出力先: ${BACKUP_DIR}/${BACKUP_FILE}"

# pg_dump実行（圧縮）
# --no-owner: リストア先で所有者を変更可能に
# --no-privileges: 権限設定を除外（環境差異対応）
# --clean: DROP文を含める
# --if-exists: 存在確認付きDROP
if pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"; then

  FILESIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
  success "バックアップ完了: ${BACKUP_FILE} (${FILESIZE})"
else
  error "バックアップ失敗"
  rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
  exit 1
fi

# 古いバックアップの削除（保持期間超過分）
info "古いバックアップを削除中（${RETENTION_DAYS}日以上前）..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "wbs_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
  info "削除済み: ${DELETED_COUNT} ファイル"
fi

# 現在のバックアップ一覧
info "現在のバックアップ:"
ls -lh "$BACKUP_DIR"/wbs_*.sql.gz 2>/dev/null || echo "  (なし)"

success "バックアップ処理完了"
