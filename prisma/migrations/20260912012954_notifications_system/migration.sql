/*
  Warnings:

  - You are about to drop the `NotificationDismissal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NotificationDismissal" DROP CONSTRAINT "NotificationDismissal_userId_fkey";

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "vapidPrivateKeyEncrypted" TEXT,
ADD COLUMN     "vapidPublicKey" TEXT;

-- DropTable
DROP TABLE "NotificationDismissal";

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "pushedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_archivedAt_readAt_idx" ON "Notification"("userId", "archivedAt", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_notificationKey_key" ON "Notification"("userId", "notificationKey");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
