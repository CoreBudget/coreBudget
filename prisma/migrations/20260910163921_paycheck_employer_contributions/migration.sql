-- AlterTable
ALTER TABLE "Paycheck" ADD COLUMN     "employerContributionItems" JSONB NOT NULL DEFAULT '[]';
