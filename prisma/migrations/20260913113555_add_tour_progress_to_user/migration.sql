-- AlterTable
ALTER TABLE "User" ADD COLUMN     "seenTours" TEXT[] DEFAULT ARRAY[]::TEXT[];
