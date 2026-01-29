-- CreateEnum
CREATE TYPE "MeetingRequestStatus" AS ENUM ('DRAFT', 'OPEN', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InviteeResponseStatus" AS ENUM ('PENDING', 'RESPONDED');

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "status" "MeetingRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedStart" TIMESTAMP(3),
    "confirmedEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingCandidate" (
    "id" TEXT NOT NULL,
    "meetingRequestId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "isAiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingInvitee" (
    "id" TEXT NOT NULL,
    "meetingRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InviteeResponseStatus" NOT NULL DEFAULT 'PENDING',
    "selectedCandidateIds" JSONB,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingInvitee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingRequest_organizationId_status_idx" ON "MeetingRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MeetingRequest_organizerId_idx" ON "MeetingRequest"("organizerId");

-- CreateIndex
CREATE INDEX "MeetingCandidate_meetingRequestId_idx" ON "MeetingCandidate"("meetingRequestId");

-- CreateIndex
CREATE INDEX "MeetingInvitee_meetingRequestId_idx" ON "MeetingInvitee"("meetingRequestId");

-- CreateIndex
CREATE INDEX "MeetingInvitee_userId_idx" ON "MeetingInvitee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingInvitee_meetingRequestId_userId_key" ON "MeetingInvitee"("meetingRequestId", "userId");

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingCandidate" ADD CONSTRAINT "MeetingCandidate_meetingRequestId_fkey" FOREIGN KEY ("meetingRequestId") REFERENCES "MeetingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvitee" ADD CONSTRAINT "MeetingInvitee_meetingRequestId_fkey" FOREIGN KEY ("meetingRequestId") REFERENCES "MeetingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingInvitee" ADD CONSTRAINT "MeetingInvitee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
