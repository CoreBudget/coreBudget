/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Liability` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Liability" DROP COLUMN "dueDate",
ADD COLUMN     "paymentDueDay" INTEGER;
