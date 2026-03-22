-- Sprint 5: AI配置提案 — isDraft フラグと proposalId を Schedule に追加

-- 仮配置フラグ（デフォルト false = 既存データは確定配置扱い）
ALTER TABLE "Schedule" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- AI提案元ID（提案からの仮配置の場合に記録）
ALTER TABLE "Schedule" ADD COLUMN "proposalId" TEXT;

-- 仮配置を高速に検索するためのインデックス
CREATE INDEX "Schedule_isDraft_idx" ON "Schedule"("organizationId", "isDraft") WHERE "isDraft" = true;
