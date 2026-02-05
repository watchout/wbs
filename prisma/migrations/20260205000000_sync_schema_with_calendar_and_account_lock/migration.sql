-- AlterTable: Organization - metadata カラム削除
ALTER TABLE "Organization" DROP COLUMN "metadata";

-- AlterTable: Schedule - 外部カレンダー同期フィールド追加
ALTER TABLE "Schedule" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "externalUpdatedAt" TIMESTAMP(3);

-- AlterTable: User - metadata 削除 + アカウントロックフィールド追加
ALTER TABLE "User" DROP COLUMN "metadata",
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "loginAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: UserCalendarConnection（カレンダー同期接続）
CREATE TABLE "UserCalendarConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "webhookChannelId" TEXT,
    "webhookToken" TEXT,
    "webhookExpiration" TIMESTAMP(3),
    "syncRangeStart" INTEGER NOT NULL DEFAULT -7,
    "syncRangeEnd" INTEGER NOT NULL DEFAULT 28,
    "lastSyncedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCalendarConnection_organizationId_idx" ON "UserCalendarConnection"("organizationId");

-- CreateIndex
CREATE INDEX "UserCalendarConnection_webhookChannelId_idx" ON "UserCalendarConnection"("webhookChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCalendarConnection_userId_provider_key" ON "UserCalendarConnection"("userId", "provider");

-- CreateIndex
CREATE INDEX "Schedule_externalId_externalSource_idx" ON "Schedule"("externalId", "externalSource");

-- AddForeignKey
ALTER TABLE "UserCalendarConnection" ADD CONSTRAINT "UserCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCalendarConnection" ADD CONSTRAINT "UserCalendarConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
