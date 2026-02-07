-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "aiProvider" TEXT DEFAULT 'openai';
ALTER TABLE "Settings" ADD COLUMN "googleApiKey" TEXT;
