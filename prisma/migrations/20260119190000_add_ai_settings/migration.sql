-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "openaiModel" TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE "Settings" ADD COLUMN "aiPrompt" TEXT;
