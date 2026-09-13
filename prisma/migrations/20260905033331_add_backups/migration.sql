-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('running', 'completed', 'failed');

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "backupEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "backupRetentionDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "Backup" (
    "id" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "type" "BackupType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'running',
    "sizeBytes" INTEGER,
    "filename" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Backup_startedAt_idx" ON "Backup"("startedAt");
