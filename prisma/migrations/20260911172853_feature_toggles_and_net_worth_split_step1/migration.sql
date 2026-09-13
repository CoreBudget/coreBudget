-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Feature" ADD VALUE 'net_worth_assets';
ALTER TYPE "Feature" ADD VALUE 'net_worth_liabilities';
ALTER TYPE "Feature" ADD VALUE 'income_calculator';

-- CreateTable
CREATE TABLE "PlatformFeatureToggle" (
    "feature" "Feature" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeatureToggle_pkey" PRIMARY KEY ("feature")
);
