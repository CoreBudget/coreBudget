-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('invited', 'active', 'deactivated');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('light', 'dark');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateEnum
CREATE TYPE "LoginResult" AS ENUM ('success', 'failed_password', 'failed_2fa');

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "Feature" AS ENUM ('transactions', 'budget_envelope', 'plan', 'net_worth', 'reports', 'repeating_transactions', 'subscriptions', 'budget_settings', 'audit_log');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('read_only', 'edit', 'no_access');

-- CreateEnum
CREATE TYPE "PayeeMatchType" AS ENUM ('contains', 'starts_with', 'ends_with', 'equals');

-- CreateEnum
CREATE TYPE "TargetRepeatType" AS ENUM ('monthly', 'quarterly', 'yearly', 'long_term');

-- CreateEnum
CREATE TYPE "MonthlyFundingGoal" AS ENUM ('assign_target', 'reach_target');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('checking', 'savings', 'cash', 'investment', 'credit', 'line_credit');

-- CreateEnum
CREATE TYPE "RepeatType" AS ENUM ('daily', 'weekly', 'monthly', 'every_3_months', 'every_4_months', 'every_n_weeks', 'twice_a_month', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionCadence" AS ENUM ('monthly', 'quarterly', 'yearly', 'every_n_weeks');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'paused', 'canceled');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('property', 'land', 'vehicle', 'investment', 'other');

-- CreateEnum
CREATE TYPE "LiabilityType" AS ENUM ('mortgage', 'auto_loan', 'student_loan', 'medical_debt', 'personal_loan');

-- CreateEnum
CREATE TYPE "PayPeriodType" AS ENUM ('weekly', 'bi_weekly', 'semi_monthly', 'monthly');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('uncategorized_transactions', 'needs_review', 'over_budget', 'reconciliation_due', 'card_expiring');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'invited',
    "locale" TEXT,
    "themeMode" "ThemeMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvite" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "device" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistoryEntry" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "device" TEXT,
    "result" "LoginResult" NOT NULL,

    CONSTRAINT "LoginHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" UUID NOT NULL,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 1440,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "smtpFromAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdAccess" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "role" "HouseholdRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAccess" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturePermission" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "feature" "Feature" NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'no_access',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payee" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "includeInList" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoCategory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayeeRenamingRule" (
    "id" UUID NOT NULL,
    "payeeId" UUID NOT NULL,
    "matchType" "PayeeMatchType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayeeRenamingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayeeAutoCategory" (
    "id" UUID NOT NULL,
    "payeeId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayeeAutoCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isIncome" BOOLEAN NOT NULL DEFAULT false,
    "isSavings" BOOLEAN NOT NULL DEFAULT false,
    "isCreditCardPayment" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hideFromBudget" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dayOfMonth" INTEGER,
    "monthNeededBy" TEXT,
    "targetAmount" DECIMAL(14,2),
    "targetDueDate" DATE,
    "targetRepeatType" "TargetRepeatType",
    "monthlyFundingGoal" "MonthlyFundingGoal",
    "savingsPerMonth" DECIMAL(14,2),
    "savingsPerQuarter" DECIMAL(14,2),
    "quarterlyMonths" JSONB,
    "savingsPerYear" DECIMAL(14,2),
    "startDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryAssignment" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "assigned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "activity" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "carryover" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "available" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPlanSnapshot" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "targetAmount" DECIMAL(14,2),
    "targetRepeatType" "TargetRepeatType",
    "monthlyFundingGoal" "MonthlyFundingGoal",
    "savingsPerMonth" DECIMAL(14,2),
    "savingsPerQuarter" DECIMAL(14,2),
    "quarterlyMonths" JSONB,
    "savingsPerYear" DECIMAL(14,2),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryPlanSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "unclearedBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "clearedBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentDate" DATE,
    "reconciledDate" TIMESTAMP(3),
    "cardExpirationDate" DATE,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "linkedLiabilityId" UUID,
    "postDate" DATE NOT NULL,
    "payeeId" UUID NOT NULL,
    "categoryId" UUID,
    "memo" TEXT,
    "debit" DECIMAL(14,2),
    "credit" DECIMAL(14,2),
    "runningBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "repeatingTransactionId" UUID,
    "isScheduled" BOOLEAN DEFAULT false,
    "pendingApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionSplit" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "memo" TEXT,
    "debit" DECIMAL(14,2),
    "credit" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepeatingTransaction" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "payeeId" UUID NOT NULL,
    "categoryId" UUID,
    "debit" DECIMAL(14,2),
    "credit" DECIMAL(14,2),
    "memo" TEXT,
    "repeatType" "RepeatType" NOT NULL,
    "intervalWeeks" INTEGER,
    "nextOccurrenceDate" DATE NOT NULL,
    "lastCreatedDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepeatingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepeatingTransactionSplit" (
    "id" UUID NOT NULL,
    "repeatingTransactionId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "memo" TEXT,
    "debit" DECIMAL(14,2),
    "credit" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepeatingTransactionSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionViewPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionViewPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "cadence" "SubscriptionCadence" NOT NULL,
    "intervalWeeks" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "renewalDate" DATE NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "accountId" UUID NOT NULL,
    "categoryId" UUID,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "trialEndDate" DATE,
    "notes" TEXT,
    "repeatingTransactionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPriceChange" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "purchaseDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetValueChange" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetValueChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liability" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LiabilityType" NOT NULL,
    "startingBalance" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "interestPaidToDate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "interestRate" DECIMAL(7,4),
    "minimumPayment" DECIMAL(14,2),
    "dueDate" DATE,
    "loanStartDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiabilityBalanceChange" (
    "id" UUID NOT NULL,
    "liabilityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiabilityBalanceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "payPeriodType" "PayPeriodType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaycheckTemplate" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "grossIncome" DECIMAL(14,2) NOT NULL,
    "incomeItems" JSONB NOT NULL,
    "withholdingItems" JSONB NOT NULL,
    "employerContributionItems" JSONB NOT NULL,
    "federalTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "oasdiAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "medicareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stateTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "oasdiCalculationRule" TEXT,
    "medicareCalculationRule" TEXT,
    "stateTaxCalculationRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaycheckTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paycheck" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "periodStartDate" DATE NOT NULL,
    "periodEndDate" DATE NOT NULL,
    "grossIncome" DECIMAL(14,2) NOT NULL,
    "incomeItems" JSONB NOT NULL,
    "withholdingItems" JSONB NOT NULL,
    "federalTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "oasdiAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "medicareAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stateTaxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paycheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTaxSettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fillingType" TEXT,
    "stateTaxRate" DECIMAL(7,4),
    "socialSecurityRate" DECIMAL(7,4),
    "medicareRate" DECIMAL(7,4),
    "fourZeroOneKContributionRate" DECIMAL(7,4),
    "fourZeroOneKMatchRate" DECIMAL(7,4),
    "fourZeroOneKMaxContributionRate" DECIMAL(14,2),
    "standardDeduction" DECIMAL(14,2),
    "childDependencyCredit" DECIMAL(14,2),
    "otherDependencyCredit" DECIMAL(14,2),
    "eligibleChildDependents" INTEGER,
    "eligibleOtherDependents" INTEGER,
    "studentLoanCapAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTaxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteCategory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDismissal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keysP256dh" TEXT NOT NULL,
    "keysAuth" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "UserInvite_email_idx" ON "UserInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_lastActiveAt_idx" ON "UserSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "LoginHistoryEntry_userId_timestamp_idx" ON "LoginHistoryEntry"("userId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdAccess_userId_householdId_key" ON "HouseholdAccess"("userId", "householdId");

-- CreateIndex
CREATE INDEX "Budget_householdId_idx" ON "Budget"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAccess_userId_budgetId_key" ON "BudgetAccess"("userId", "budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturePermission_userId_budgetId_feature_key" ON "FeaturePermission"("userId", "budgetId", "feature");

-- CreateIndex
CREATE INDEX "Payee_name_idx" ON "Payee"("name");

-- CreateIndex
CREATE INDEX "PayeeRenamingRule_payeeId_idx" ON "PayeeRenamingRule"("payeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayeeAutoCategory_payeeId_budgetId_key" ON "PayeeAutoCategory"("payeeId", "budgetId");

-- CreateIndex
CREATE INDEX "Section_budgetId_idx" ON "Section"("budgetId");

-- CreateIndex
CREATE INDEX "Category_sectionId_idx" ON "Category"("sectionId");

-- CreateIndex
CREATE INDEX "CategoryAssignment_month_idx" ON "CategoryAssignment"("month");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryAssignment_categoryId_month_key" ON "CategoryAssignment"("categoryId", "month");

-- CreateIndex
CREATE INDEX "CategoryPlanSnapshot_budgetId_month_idx" ON "CategoryPlanSnapshot"("budgetId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPlanSnapshot_categoryId_month_key" ON "CategoryPlanSnapshot"("categoryId", "month");

-- CreateIndex
CREATE INDEX "Account_budgetId_idx" ON "Account"("budgetId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_postDate_idx" ON "Transaction"("accountId", "postDate");

-- CreateIndex
CREATE INDEX "Transaction_payeeId_idx" ON "Transaction"("payeeId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "Transaction_pendingApproval_idx" ON "Transaction"("pendingApproval");

-- CreateIndex
CREATE INDEX "Transaction_isScheduled_idx" ON "Transaction"("isScheduled");

-- CreateIndex
CREATE INDEX "TransactionSplit_transactionId_idx" ON "TransactionSplit"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionSplit_categoryId_idx" ON "TransactionSplit"("categoryId");

-- CreateIndex
CREATE INDEX "RepeatingTransaction_accountId_idx" ON "RepeatingTransaction"("accountId");

-- CreateIndex
CREATE INDEX "RepeatingTransaction_isActive_nextOccurrenceDate_idx" ON "RepeatingTransaction"("isActive", "nextOccurrenceDate");

-- CreateIndex
CREATE INDEX "RepeatingTransactionSplit_repeatingTransactionId_idx" ON "RepeatingTransactionSplit"("repeatingTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionViewPreference_userId_accountId_key" ON "TransactionViewPreference"("userId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_repeatingTransactionId_key" ON "Subscription"("repeatingTransactionId");

-- CreateIndex
CREATE INDEX "Subscription_budgetId_idx" ON "Subscription"("budgetId");

-- CreateIndex
CREATE INDEX "Subscription_accountId_idx" ON "Subscription"("accountId");

-- CreateIndex
CREATE INDEX "SubscriptionPriceChange_subscriptionId_idx" ON "SubscriptionPriceChange"("subscriptionId");

-- CreateIndex
CREATE INDEX "Asset_budgetId_idx" ON "Asset"("budgetId");

-- CreateIndex
CREATE INDEX "AssetValueChange_assetId_date_idx" ON "AssetValueChange"("assetId", "date");

-- CreateIndex
CREATE INDEX "Liability_budgetId_idx" ON "Liability"("budgetId");

-- CreateIndex
CREATE INDEX "LiabilityBalanceChange_liabilityId_date_idx" ON "LiabilityBalanceChange"("liabilityId", "date");

-- CreateIndex
CREATE INDEX "Job_userId_idx" ON "Job"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaycheckTemplate_jobId_key" ON "PaycheckTemplate"("jobId");

-- CreateIndex
CREATE INDEX "Paycheck_jobId_periodStartDate_idx" ON "Paycheck"("jobId", "periodStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserTaxSettings_userId_key" ON "UserTaxSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteCategory_userId_categoryId_key" ON "FavoriteCategory"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDismissal_userId_notificationKey_key" ON "NotificationDismissal"("userId", "notificationKey");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_notificationType_key" ON "NotificationPreference"("userId", "notificationType");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");

-- CreateIndex
CREATE INDEX "ApiToken_budgetId_idx" ON "ApiToken"("budgetId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_budgetId_createdAt_idx" ON "AuditLogEntry"("budgetId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_entityType_entityId_idx" ON "AuditLogEntry"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistoryEntry" ADD CONSTRAINT "LoginHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdAccess" ADD CONSTRAINT "HouseholdAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdAccess" ADD CONSTRAINT "HouseholdAccess_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAccess" ADD CONSTRAINT "BudgetAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAccess" ADD CONSTRAINT "BudgetAccess_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturePermission" ADD CONSTRAINT "FeaturePermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturePermission" ADD CONSTRAINT "FeaturePermission_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeRenamingRule" ADD CONSTRAINT "PayeeRenamingRule_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeAutoCategory" ADD CONSTRAINT "PayeeAutoCategory_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeAutoCategory" ADD CONSTRAINT "PayeeAutoCategory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayeeAutoCategory" ADD CONSTRAINT "PayeeAutoCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryAssignment" ADD CONSTRAINT "CategoryAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPlanSnapshot" ADD CONSTRAINT "CategoryPlanSnapshot_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPlanSnapshot" ADD CONSTRAINT "CategoryPlanSnapshot_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_linkedLiabilityId_fkey" FOREIGN KEY ("linkedLiabilityId") REFERENCES "Liability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_repeatingTransactionId_fkey" FOREIGN KEY ("repeatingTransactionId") REFERENCES "RepeatingTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatingTransaction" ADD CONSTRAINT "RepeatingTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatingTransaction" ADD CONSTRAINT "RepeatingTransaction_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatingTransaction" ADD CONSTRAINT "RepeatingTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatingTransactionSplit" ADD CONSTRAINT "RepeatingTransactionSplit_repeatingTransactionId_fkey" FOREIGN KEY ("repeatingTransactionId") REFERENCES "RepeatingTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepeatingTransactionSplit" ADD CONSTRAINT "RepeatingTransactionSplit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionViewPreference" ADD CONSTRAINT "TransactionViewPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionViewPreference" ADD CONSTRAINT "TransactionViewPreference_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_repeatingTransactionId_fkey" FOREIGN KEY ("repeatingTransactionId") REFERENCES "RepeatingTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPriceChange" ADD CONSTRAINT "SubscriptionPriceChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetValueChange" ADD CONSTRAINT "AssetValueChange_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiabilityBalanceChange" ADD CONSTRAINT "LiabilityBalanceChange_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "Liability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaycheckTemplate" ADD CONSTRAINT "PaycheckTemplate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paycheck" ADD CONSTRAINT "Paycheck_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTaxSettings" ADD CONSTRAINT "UserTaxSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCategory" ADD CONSTRAINT "FavoriteCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCategory" ADD CONSTRAINT "FavoriteCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDismissal" ADD CONSTRAINT "NotificationDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
