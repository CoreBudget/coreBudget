-- CreateEnum
CREATE TYPE "ErrorLogSource" AS ENUM ('react_error_boundary', 'uncaught_exception', 'unhandled_rejection');

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" UUID NOT NULL,
    "source" "ErrorLogSource" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");
