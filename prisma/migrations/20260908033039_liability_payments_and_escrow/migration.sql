-- CreateEnum
CREATE TYPE "EscrowEntryType" AS ENUM ('deposit', 'disbursement');

-- CreateTable
CREATE TABLE "LiabilityPayment" (
    "id" UUID NOT NULL,
    "liabilityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "paymentAmount" DECIMAL(14,2) NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL,
    "interest" DECIMAL(14,2) NOT NULL,
    "escrowAmount" DECIMAL(14,2),
    "endingBalance" DECIMAL(14,2) NOT NULL,
    "accountId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiabilityPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowEntry" (
    "id" UUID NOT NULL,
    "liabilityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "type" "EscrowEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "runningBalance" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "liabilityPaymentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiabilityPayment_liabilityId_date_idx" ON "LiabilityPayment"("liabilityId", "date");

-- CreateIndex
CREATE INDEX "EscrowEntry_liabilityId_date_idx" ON "EscrowEntry"("liabilityId", "date");

-- AddForeignKey
ALTER TABLE "LiabilityPayment" ADD CONSTRAINT "LiabilityPayment_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "Liability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiabilityPayment" ADD CONSTRAINT "LiabilityPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowEntry" ADD CONSTRAINT "EscrowEntry_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "Liability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowEntry" ADD CONSTRAINT "EscrowEntry_liabilityPaymentId_fkey" FOREIGN KEY ("liabilityPaymentId") REFERENCES "LiabilityPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
