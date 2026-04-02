-- Sprint 6: 通知基盤

-- 通知チャネル enum
CREATE TYPE "NotifChannel" AS ENUM ('EMAIL', 'TOAST', 'PUSH');

-- 通知ステータス enum
CREATE TYPE "NotifStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- 通知ログテーブル
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" "NotifChannel" NOT NULL,
    "eventType" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotifStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- ユーザーにメール通知設定を追加
ALTER TABLE "User" ADD COLUMN "notifyEmail" BOOLEAN NOT NULL DEFAULT true;

-- 外部キー
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- インデックス
CREATE INDEX "NotificationLog_organizationId_recipientId_idx" ON "NotificationLog"("organizationId", "recipientId");
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");
