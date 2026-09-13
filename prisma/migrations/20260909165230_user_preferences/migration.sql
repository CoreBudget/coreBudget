-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultLedgerDatePreset" TEXT,
ADD COLUMN     "defaultLedgerSortColumn" TEXT,
ADD COLUMN     "defaultLedgerSortDirection" TEXT,
ADD COLUMN     "planSectionsDefaultOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserPagePreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "pageKey" TEXT NOT NULL,
    "rowsPerPage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPagePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPagePreference_userId_pageKey_key" ON "UserPagePreference"("userId", "pageKey");

-- AddForeignKey
ALTER TABLE "UserPagePreference" ADD CONSTRAINT "UserPagePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
