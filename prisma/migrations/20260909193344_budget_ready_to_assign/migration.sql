-- CreateTable
CREATE TABLE "BudgetReadyToAssign" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetReadyToAssign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetReadyToAssign_month_idx" ON "BudgetReadyToAssign"("month");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetReadyToAssign_budgetId_month_key" ON "BudgetReadyToAssign"("budgetId", "month");

-- AddForeignKey
ALTER TABLE "BudgetReadyToAssign" ADD CONSTRAINT "BudgetReadyToAssign_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
