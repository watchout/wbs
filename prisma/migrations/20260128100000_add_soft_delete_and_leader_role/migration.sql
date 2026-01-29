-- AlterEnum: Add LEADER role
ALTER TYPE "Role" ADD VALUE 'LEADER';

-- AlterTable: Add deletedAt to Department
ALTER TABLE "Department" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to User
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Schedule
ALTER TABLE "Schedule" ADD COLUMN "deletedAt" TIMESTAMP(3);
