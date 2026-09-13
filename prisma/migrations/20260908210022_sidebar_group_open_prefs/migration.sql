-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sidebarAccountsOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sidebarNetWorthOpen" BOOLEAN NOT NULL DEFAULT true;
