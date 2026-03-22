-- Sprint 4: Add PlanningDocument and PlanningParseReview tables
-- Add enums for Planning Document

CREATE TYPE "DocumentFileType" AS ENUM ('PDF', 'IMAGE');
CREATE TYPE "DocumentParseStatus" AS ENUM ('PENDING', 'PARSING', 'PARSED', 'FAILED', 'NEEDS_REVIEW');

-- Create PlanningDocument table
CREATE TABLE "PlanningDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "siteId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "parseStatus" "DocumentParseStatus" NOT NULL DEFAULT 'PENDING',
    "parserVersion" TEXT,
    "rawExtractJson" JSONB,
    "summaryText" TEXT,
    "errorMessage" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PlanningDocument_pkey" PRIMARY KEY ("id")
);

-- Create PlanningParseReview table
CREATE TABLE "PlanningParseReview" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningParseReview_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "PlanningDocument" ADD CONSTRAINT "PlanningDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanningDocument" ADD CONSTRAINT "PlanningDocument_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanningParseReview" ADD CONSTRAINT "PlanningParseReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PlanningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "PlanningDocument_organizationId_siteId_idx" ON "PlanningDocument"("organizationId", "siteId");
CREATE INDEX "PlanningDocument_organizationId_parseStatus_idx" ON "PlanningDocument"("organizationId", "parseStatus");
CREATE INDEX "PlanningParseReview_documentId_idx" ON "PlanningParseReview"("documentId");
