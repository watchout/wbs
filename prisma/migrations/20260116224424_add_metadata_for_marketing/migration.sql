-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "metadata" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "metadata" JSONB DEFAULT '{}';
