-- CreateEnum
CREATE TYPE "RetirementAccountType" AS ENUM ('401k', 'ira', 'roth_ira', 'pension');

-- AlterTable
ALTER TABLE "UserTaxSettings" ADD COLUMN     "estimatedTaxLiability" DECIMAL(14,2),
ADD COLUMN     "retirementGoalAge" INTEGER,
ADD COLUMN     "retirementGoalAmount" DECIMAL(14,2),
ADD COLUMN     "ytdWithheldAmount" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "RetirementAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RetirementAccountType" NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "contributionPct" DECIMAL(5,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetirementAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetirementAccount_userId_idx" ON "RetirementAccount"("userId");

-- AddForeignKey
ALTER TABLE "RetirementAccount" ADD CONSTRAINT "RetirementAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
