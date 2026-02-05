#!/usr/bin/env bash
# OPS-003: PostgreSQL リストアスクリプト
#
# Usage:
#   ./scripts/restore-db.sh backups/wbs_20240101_120000.sql.gz
#   ./scripts/restore-db.sh latest   # 最新のバックアップをリストア
#
# 環境変数:
#   DATABASE_URL  - PostgreSQL接続URL（必須）
#
# 警告:
#   - 本番環境での実行前に必ず確認プロンプトが表示されます
#   - 既存データは上書きされます

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"

# 色付き出力
info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1" >&2; }
warn() { echo -e "\033[0;33m[WARN]\033[0m $1"; }

# 引数チェック
if [ -z "${1:-}" ]; then
  error "バックアップファイルを指定してください"
  echo ""
  echo "Usage: $0 <backup_file|latest>"
  echo ""
  echo "利用可能なバックアップ:"
  ls -lh "$BACKUP_DIR"/wbs_*.sql.gz 2>/dev/null || echo "  (なし)"
  exit 1
fi

# DATABASE_URL チェック
if [ -z "${DATABASE_URL:-}" ]; then
  error "DATABASE_URL が設定されていません"
  echo "例: export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'"
  exit 1
fi

# バックアップファイル決定
BACKUP_FILE="$1"
if [ "$BACKUP_FILE" = "latest" ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/wbs_*.sql.gz 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    error "バックアップファイルが見つかりません"
    exit 1
  fi
  info "最新バックアップを選択: $BACKUP_FILE"
fi

# ファイル存在チェック
if [ ! -f "$BACKUP_FILE" ]; then
  error "バックアップファイルが見つかりません: $BACKUP_FILE"
  exit 1
fi

# ファイル情報表示
FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILEDATE=$(stat -c %y "$BACKUP_FILE" 2>/dev/null || stat -f %Sm "$BACKUP_FILE" 2>/dev/null)
info "リストア対象: $BACKUP_FILE"
info "ファイルサイズ: $FILESIZE"
info "作成日時: $FILEDATE"

# 確認プロンプト（CI環境ではスキップ）
if [ -z "${CI:-}" ] && [ -t 0 ]; then
  warn "警告: この操作は既存のデータベースを上書きします"
  echo ""
  read -p "続行しますか? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    info "リストアを中止しました"
    exit 0
  fi
fi

info "PostgreSQL リストア開始..."

# リストア実行
if gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" --quiet; then
  success "リストア完了"
else
  error "リストア失敗"
  exit 1
fi

# テーブル一覧表示
info "リストア後のテーブル一覧:"
psql "$DATABASE_URL" --quiet -c "\dt" 2>/dev/null || true

success "リストア処理完了"
