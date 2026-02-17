-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "llmModel" TEXT,
ADD COLUMN     "llmProvider" TEXT NOT NULL DEFAULT 'openai';
