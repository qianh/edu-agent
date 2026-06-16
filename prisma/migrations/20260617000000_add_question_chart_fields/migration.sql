-- AlterTable
ALTER TABLE "Question" ADD COLUMN "isChart" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Question" ADD COLUMN "chartSpec" JSONB;
ALTER TABLE "Question" ADD COLUMN "chartImagePrompt" TEXT;
