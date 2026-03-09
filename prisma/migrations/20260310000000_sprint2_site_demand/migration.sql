-- Sprint 2: Site/SiteDemand models + Schedule.siteId
-- SSOT: SSOT_SITE_ALLOCATION.md §9.1, §9.2, §9.5

-- Enums
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED');
CREATE TYPE "TimeSlot" AS ENUM ('ALL_DAY', 'AM', 'PM', 'NIGHT');
CREATE TYPE "DemandPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "DemandSourceType" AS ENUM ('MANUAL', 'AI_PARSED', 'IMPORTED');
CREATE TYPE "ConfirmationStatus" AS ENUM ('UNCONFIRMED', 'CONFIRMED');

-- Site (現場マスタ)
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "clientName" TEXT,
    "status" "SiteStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- SiteDemand (現場必要人員)
CREATE TABLE "SiteDemand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tradeType" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL DEFAULT 'ALL_DAY',
    "priority" "DemandPriority" NOT NULL DEFAULT 'MEDIUM',
    "sourceType" "DemandSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceDocumentId" TEXT,
    "confidence" DOUBLE PRECISION,
    "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDemand_pkey" PRIMARY KEY ("id")
);

-- Schedule.siteId (nullable FK)
ALTER TABLE "Schedule" ADD COLUMN "siteId" TEXT;

-- Foreign keys
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteDemand" ADD CONSTRAINT "SiteDemand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteDemand" ADD CONSTRAINT "SiteDemand_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes (SSOT §9.1, §9.2)
CREATE INDEX "Site_organizationId_status_idx" ON "Site"("organizationId", "status");
CREATE INDEX "Site_organizationId_name_idx" ON "Site"("organizationId", "name");
CREATE INDEX "SiteDemand_organizationId_siteId_date_idx" ON "SiteDemand"("organizationId", "siteId", "date");
CREATE INDEX "SiteDemand_organizationId_date_idx" ON "SiteDemand"("organizationId", "date");

-- Unique constraint (SSOT §9.2)
CREATE UNIQUE INDEX "SiteDemand_siteId_date_tradeType_timeSlot_key" ON "SiteDemand"("siteId", "date", "tradeType", "timeSlot");
