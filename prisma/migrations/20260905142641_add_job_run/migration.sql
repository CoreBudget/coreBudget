-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "JobRun" (
    "id" UUID NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'running',
    "detail" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_jobName_startedAt_idx" ON "JobRun"("jobName", "startedAt");
