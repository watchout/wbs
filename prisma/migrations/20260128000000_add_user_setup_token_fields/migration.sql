-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "setupToken" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "setupTokenExpiry" TIMESTAMP(3);
