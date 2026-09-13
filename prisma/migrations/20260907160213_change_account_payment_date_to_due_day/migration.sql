/*
  Warnings:

  - You are about to drop the column `paymentDate` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "paymentDate",
ADD COLUMN     "paymentDueDay" INTEGER;
