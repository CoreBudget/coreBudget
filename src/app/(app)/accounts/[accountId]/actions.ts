"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature, type Prisma } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import {
  findOrCreatePayee,
  getPayeeAutoCategoryMap,
  getPayeeRenamingRules,
  recalculateAccountBalances,
} from "@/lib/transactions";
import { logAudit } from "@/lib/auditLog";
import { stripAmountFormatting } from "@/lib/amount";
import {
  CADENCE_OPTIONS,
  cadenceToRepeatType,
  type CadenceOption,
} from "../../budget-settings/repeating/cadence";
import type { ViewPreference } from "./viewPreference";

export interface FormResult {
  error?: string;
}

function amountField(min?: number) {
  const schema = min === undefined ? z.coerce.number() : z.coerce.number().min(min);
  return z.preprocess(
    (val) => (typeof val === "string" ? stripAmountFormatting(val) : val),
    schema,
  );
}

const txnSchema = z.object({
  postDate: z.string().min(1, "transactions.errors.dateRequired"),
  payeeName: z.string().min(1, "transactions.errors.payeeRequired"),
  categoryId: z.string().optional(),
  memo: z.string().optional(),
  debit: amountField(0).optional(),
  credit: amountField(0).optional(),
  cleared: z.enum(["on"]).optional(),
  splitsJson: z.string().optional(),
});

const splitSchema = z.object({
  categoryId: z.string().min(1),
  memo: z.string().optional(),
  debit: amountField().optional(),
  credit: amountField().optional(),
});
const splitsArraySchema = z.array(splitSchema);

function parseSplits(
  splitsJson: string | undefined,
  parentDebit: number | undefined,
  parentCredit: number | undefined,
): { splits: z.infer<typeof splitsArraySchema> | null; error: string | null } {
  if (!splitsJson) return { splits: null, error: null };

  let raw: unknown;
  try {
    raw = JSON.parse(splitsJson);
  } catch {
    return { splits: null, error: "transactions.errors.invalidSplitsPayload" };
  }
  const parsed = splitsArraySchema.safeParse(raw);
  if (!parsed.success) return { splits: null, error: "transactions.errors.invalidSplitsPayload" };
  if (parsed.data.length === 0) {
    return { splits: null, error: "transactions.errors.addAtLeastOneSplit" };
  }

  const net = parsed.data.reduce((sum, s) => sum + (s.debit ?? 0) - (s.credit ?? 0), 0);
  const parentNet = (parentDebit ?? 0) - (parentCredit ?? 0);
  if (Math.abs(net - parentNet) > 0.005) {
    return { splits: null, error: "transactions.errors.splitsMismatch" };
  }

  return { splits: parsed.data, error: null };
}

async function assertAccountAccess(accountId: string) {
  const { user, workspace, level } = await requireFeature(Feature.transactions);
  if (level !== "edit") throw new Error("transactions.errors.readOnly");

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.budgetId !== workspace.budget.id) {
    throw new Error("transactions.errors.accountNotFound");
  }
  return { account, budgetId: workspace.budget.id, userId: user.id };
}

async function assertAccountViewable(accountId: string) {
  const { user, workspace } = await requireFeature(Feature.transactions);
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.budgetId !== workspace.budget.id) {
    throw new Error("transactions.errors.accountNotFound");
  }
  return { account, userId: user.id };
}

function validateAmounts(debit?: number, credit?: number): string | null {
  const hasDebit = !!debit;
  const hasCredit = !!credit;
  if (hasDebit && hasCredit) return "transactions.errors.onlyOneAmount";
  if (!hasDebit && !hasCredit) return "transactions.errors.amountRequired";
  return null;
}

async function resolveCategoryId(
  budgetId: string,
  payeeId: string,
  explicitCategoryId: string | undefined,
  hasSplits: boolean,
): Promise<string | null> {
  if (hasSplits) return null;
  if (explicitCategoryId) return explicitCategoryId;
  const autoCategoryByPayeeId = await getPayeeAutoCategoryMap(budgetId, [payeeId]);
  return autoCategoryByPayeeId.get(payeeId) ?? null;
}

export async function createTransactionAction(
  accountId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const parsed = txnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  const amountError = validateAmounts(parsed.data.debit, parsed.data.credit);
  if (amountError) return { error: amountError };

  const { splits, error: splitsError } = parseSplits(
    parsed.data.splitsJson,
    parsed.data.debit,
    parsed.data.credit,
  );
  if (splitsError) return { error: splitsError };

  const payeeId = await findOrCreatePayee(parsed.data.payeeName);
  const categoryId = await resolveCategoryId(budgetId, payeeId, parsed.data.categoryId, !!splits);

  const transaction = await prisma.transaction.create({
    data: {
      accountId,
      postDate: new Date(parsed.data.postDate),
      payeeId,
      categoryId,
      memo: parsed.data.memo || null,
      debit: parsed.data.debit || null,
      credit: parsed.data.credit || null,
      cleared: parsed.data.cleared === "on",
      isSplit: !!splits,
      ...(splits && {
        splits: {
          create: splits.map((s) => ({
            categoryId: s.categoryId,
            memo: s.memo || null,
            debit: s.debit || null,
            credit: s.credit || null,
          })),
        },
      }),
    },
  });

  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "create",
    entityType: "Transaction",
    entityId: transaction.id,
    summary: `Created transaction: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`} to '${parsed.data.payeeName}' on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

const CASH_TYPES = new Set(["checking", "savings", "cash", "investment"]);

const recordPaymentSchema = z.object({
  postDate: z.string().min(1, "transactions.errors.dateRequired"),
  fromAccountId: z.string().min(1, "accounts.recordPayment.errors.fromAccountRequired"),
  amount: amountField(0.01),
  memo: z.string().optional(),
});

export async function recordAccountPaymentAction(
  creditAccountId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let creditAccountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: creditAccountName },
    } = await assertAccountAccess(creditAccountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { postDate, fromAccountId, amount, memo } = parsed.data;

  if (fromAccountId === creditAccountId) {
    return { error: "accounts.recordPayment.errors.sameAccount" };
  }

  const fromAccount = await prisma.account.findUnique({ where: { id: fromAccountId } });
  if (!fromAccount || fromAccount.budgetId !== budgetId || !CASH_TYPES.has(fromAccount.type)) {
    return { error: "accounts.recordPayment.errors.invalidFromAccount" };
  }

  const [toPayeeId, fromPayeeId] = await Promise.all([
    findOrCreatePayee(creditAccountName),
    findOrCreatePayee(fromAccount.name),
  ]);

  const postDateObj = new Date(postDate);
  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId: fromAccountId,
        postDate: postDateObj,
        payeeId: toPayeeId,
        memo: memo || null,
        debit: amount,
        cleared: false,
        pendingApproval: false,
      },
    }),
    prisma.transaction.create({
      data: {
        accountId: creditAccountId,
        postDate: postDateObj,
        payeeId: fromPayeeId,
        memo: memo || null,
        credit: amount,
        cleared: false,
        pendingApproval: false,
      },
    }),
  ]);

  await Promise.all([
    recalculateAccountBalances(fromAccountId),
    recalculateAccountBalances(creditAccountId),
  ]);

  await logAudit({
    budgetId,
    userId,
    action: "create",
    entityType: "Transaction",
    entityId: creditAccountId,
    summary: `Recorded a payment of $${amount.toFixed(2)} from '${fromAccount.name}' to '${creditAccountName}'`,
  });

  revalidatePath(`/accounts/${creditAccountId}`);
  revalidatePath(`/accounts/${fromAccountId}`);
  return {};
}

export async function updateTransactionAction(
  accountId: string,
  transactionId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }

  const parsed = txnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  const amountError = validateAmounts(parsed.data.debit, parsed.data.credit);
  if (amountError) return { error: amountError };

  const { splits, error: splitsError } = parseSplits(
    parsed.data.splitsJson,
    parsed.data.debit,
    parsed.data.credit,
  );
  if (splitsError) return { error: splitsError };

  const payeeId = await findOrCreatePayee(parsed.data.payeeName);
  const categoryId = await resolveCategoryId(budgetId, payeeId, parsed.data.categoryId, !!splits);

  await prisma.$transaction([
    prisma.transactionSplit.deleteMany({ where: { transactionId } }),
    prisma.transaction.update({
      where: { id: transactionId },
      data: {
        postDate: new Date(parsed.data.postDate),
        payeeId,
        categoryId,
        memo: parsed.data.memo || null,
        debit: parsed.data.debit || null,
        credit: parsed.data.credit || null,
        cleared: parsed.data.cleared === "on",
        isSplit: !!splits,
        ...(splits && {
          splits: {
            create: splits.map((s) => ({
              categoryId: s.categoryId,
              memo: s.memo || null,
              debit: s.debit || null,
              credit: s.credit || null,
            })),
          },
        }),
      },
    }),
  ]);

  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Transaction",
    entityId: transactionId,
    summary: `Edited transaction to '${parsed.data.payeeName}' on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function bulkDeleteTransactionsAction(
  accountId: string,
  transactionIds: string[],
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
  if (transactionIds.length === 0) return {};

  await prisma.transaction.deleteMany({ where: { id: { in: transactionIds }, accountId } });
  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "delete",
    entityType: "Transaction",
    entityId: transactionIds[0],
    summary:
      transactionIds.length === 1
        ? `Deleted 1 transaction on '${accountName}'`
        : `Deleted ${transactionIds.length} transactions on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function bulkSetClearedAction(
  accountId: string,
  transactionIds: string[],
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
  if (transactionIds.length === 0) return {};

  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, accountId },
    data: { cleared: true },
  });
  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Transaction",
    entityId: transactionIds[0],
    summary: `Marked ${transactionIds.length} transaction${transactionIds.length === 1 ? "" : "s"} cleared on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function bulkCategorizeTransactionsAction(
  accountId: string,
  transactionIds: string[],
  categoryId: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
  if (transactionIds.length === 0) return {};

  let categoryName: string | null = null;
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true, section: { select: { budgetId: true } } },
    });
    if (!category || category.section.budgetId !== budgetId) {
      return { error: "budgetSettings.errors.categoryNotFound" };
    }
    categoryName = category.name;
  }

  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, accountId, isSplit: false },
    data: { categoryId: categoryId || null },
  });
  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Transaction",
    entityId: transactionIds[0],
    summary: `Categorized ${transactionIds.length} transaction${transactionIds.length === 1 ? "" : "s"} as ${categoryName ? `'${categoryName}'` : "Uncategorized"} on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function duplicateTransactionAction(
  accountId: string,
  transactionId: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }

  const duplicate = await prisma.transaction.create({
    data: {
      accountId,
      postDate: new Date(),
      payeeId: existing.payeeId,
      categoryId: existing.categoryId,
      memo: existing.memo,
      debit: existing.debit,
      credit: existing.credit,
      cleared: false,
      pendingApproval: false,
    },
  });

  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "create",
    entityType: "Transaction",
    entityId: duplicate.id,
    summary: `Duplicated a transaction on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function toggleClearedAction(
  accountId: string,
  transactionId: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { cleared: !existing.cleared },
  });

  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Transaction",
    entityId: transactionId,
    summary: `Marked transaction ${existing.cleared ? "not cleared" : "cleared"} on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function toggleSplitsCollapsedAction(
  accountId: string,
  transactionId: string,
): Promise<FormResult> {
  try {
    await assertAccountViewable(accountId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { splitsCollapsed: !existing.splitsCollapsed },
  });

  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function setAllSplitsCollapsedAction(
  accountId: string,
  collapsed: boolean,
): Promise<FormResult> {
  try {
    await assertAccountViewable(accountId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  await prisma.transaction.updateMany({
    where: { accountId, isSplit: true },
    data: { splitsCollapsed: collapsed },
  });

  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function reconcileAccountAction(accountId: string): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const [{ count }] = await prisma.$transaction([
    prisma.transaction.updateMany({
      where: { accountId, cleared: true, reconciled: false },
      data: { reconciled: true },
    }),
    prisma.account.update({ where: { id: accountId }, data: { reconciledDate: new Date() } }),
  ]);

  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Account",
    entityId: accountId,
    summary: `Reconciled ${count} transaction${count === 1 ? "" : "s"} on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function approveTransactionAction(
  accountId: string,
  transactionId: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }
  if (!existing.pendingApproval) {
    return { error: "transactions.errors.transactionNotPending" };
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { pendingApproval: false },
  });

  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Transaction",
    entityId: transactionId,
    summary: `Approved a pending transaction on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function rejectTransactionAction(
  accountId: string,
  transactionId: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const existing = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }
  if (!existing.pendingApproval) {
    return { error: "transactions.errors.transactionNotPending" };
  }

  await prisma.transaction.delete({ where: { id: transactionId } });

  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "delete",
    entityType: "Transaction",
    entityId: transactionId,
    summary: `Rejected a pending transaction on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function bulkApproveTransactionsAction(
  accountId: string,
  transactionIds: string[],
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
  if (transactionIds.length === 0) return {};

  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, accountId, pendingApproval: true },
    data: { pendingApproval: false },
  });
  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Transaction",
    entityId: transactionIds[0],
    summary: `Approved ${transactionIds.length} pending transaction${transactionIds.length === 1 ? "" : "s"} on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function bulkRejectTransactionsAction(
  accountId: string,
  transactionIds: string[],
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
  if (transactionIds.length === 0) return {};

  await prisma.transaction.deleteMany({
    where: { id: { in: transactionIds }, accountId, pendingApproval: true },
  });
  await recalculateAccountBalances(accountId);
  await logAudit({
    budgetId,
    userId,
    action: "delete",
    entityType: "Transaction",
    entityId: transactionIds[0],
    summary: `Rejected ${transactionIds.length} pending transaction${transactionIds.length === 1 ? "" : "s"} on '${accountName}'`,
  });
  revalidatePath(`/accounts/${accountId}`);
  return {};
}

export async function createRepeatingFromTransactionAction(
  accountId: string,
  transactionId: string,
  cadence: CadenceOption,
  nextOccurrenceDate: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
  if (!(CADENCE_OPTIONS as readonly string[]).includes(cadence)) {
    return { error: "budgetSettings.repeating.errors.invalidCadence" };
  }
  if (!nextOccurrenceDate) {
    return { error: "budgetSettings.repeating.errors.dateRequired" };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { splits: true },
  });
  if (!existing || existing.accountId !== accountId) {
    return { error: "transactions.errors.transactionNotFound" };
  }

  const { repeatType, intervalWeeks } = cadenceToRepeatType(cadence);

  const repeating = await prisma.repeatingTransaction.create({
    data: {
      accountId,
      payeeId: existing.payeeId,
      categoryId: existing.isSplit ? null : existing.categoryId,
      memo: existing.memo,
      debit: existing.debit,
      credit: existing.credit,
      repeatType,
      intervalWeeks,
      nextOccurrenceDate: new Date(nextOccurrenceDate),
      ...(existing.isSplit && {
        splits: {
          create: existing.splits.map((s) => ({
            categoryId: s.categoryId,
            memo: s.memo,
            debit: s.debit,
            credit: s.credit,
          })),
        },
      }),
    },
  });

  await logAudit({
    budgetId,
    userId,
    action: "create",
    entityType: "RepeatingTransaction",
    entityId: repeating.id,
    summary: `Created a repeating transaction from an existing transaction on '${accountName}'`,
  });
  revalidatePath("/budget-settings/repeating");
  return {};
}

export async function saveTransactionViewPreferenceAction(
  accountId: string,
  filters: ViewPreference,
): Promise<FormResult> {
  let userId: string;
  try {
    ({ userId } = await assertAccountViewable(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const filtersJson = filters as unknown as Prisma.InputJsonValue;
  await prisma.transactionViewPreference.upsert({
    where: { userId_accountId: { userId, accountId } },
    create: { userId, accountId, filters: filtersJson },
    update: { filters: filtersJson },
  });

  return {};
}

const MAX_IMPORT_ROWS = 500;

const importRowSchema = z.object({
  date: z
    .string()
    .min(1, "transactions.errors.importRowInvalid")
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), "transactions.errors.importRowInvalid"),
  payeeName: z.string().min(1, "transactions.errors.importRowInvalid"),
  category: z.string().optional(),
  memo: z.string().optional(),
  amount: amountField().optional(),
  debit: amountField().optional(),
  credit: amountField().optional(),
  type: z.string().optional(),
});

function normalizePayeeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function payeesFuzzyMatch(a: string, b: string): boolean {
  const na = normalizePayeeForMatch(a);
  const nb = normalizePayeeForMatch(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export async function importTransactionsAction(
  accountId: string,
  rows: Record<string, string>[],
): Promise<FormResult & { imported?: number; skipped?: number; ignored?: number }> {
  let budgetId: string;
  let userId: string;
  let accountName: string;
  try {
    ({
      budgetId,
      userId,
      account: { name: accountName },
    } = await assertAccountAccess(accountId));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  if (rows.length === 0) return { error: "transactions.errors.importEmpty" };
  if (rows.length > MAX_IMPORT_ROWS) return { error: "transactions.errors.importTooLarge" };

  const parsedRows: {
    date: Date;
    payeeName: string;
    category?: string;
    memo?: string;
    debit?: number;
    credit?: number;
  }[] = [];
  let ignored = 0;
  for (const row of rows) {
    const parsed = importRowSchema.safeParse(row);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    if (parsed.data.type?.trim().toLowerCase() === "payment") {
      ignored += 1;
      continue;
    }
    let debit: number | undefined;
    let credit: number | undefined;
    if (parsed.data.debit !== undefined || parsed.data.credit !== undefined) {
      debit = parsed.data.debit !== undefined ? Math.abs(parsed.data.debit) : undefined;
      credit = parsed.data.credit !== undefined ? Math.abs(parsed.data.credit) : undefined;
    } else if (parsed.data.amount !== undefined) {
      debit = parsed.data.amount < 0 ? -parsed.data.amount : undefined;
      credit = parsed.data.amount > 0 ? parsed.data.amount : undefined;
    }
    const amountError = validateAmounts(debit, credit);
    if (amountError) return { error: amountError };
    parsedRows.push({ ...parsed.data, debit, credit });
  }

  if (parsedRows.length === 0) return { imported: 0, skipped: 0, ignored };

  const categories = await prisma.category.findMany({
    where: { section: { budgetId } },
    select: { id: true, name: true },
  });
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const dates = parsedRows.map((r) => r.date.getTime());
  const existing = await prisma.transaction.findMany({
    where: {
      accountId,
      postDate: { gte: new Date(Math.min(...dates)), lte: new Date(Math.max(...dates)) },
    },
    include: { payee: { select: { name: true } } },
  });

  const uniquePayeeNames = [...new Set(parsedRows.map((r) => r.payeeName))];
  const renamingRules = await getPayeeRenamingRules();
  const payeeIdByName = new Map(
    await Promise.all(
      uniquePayeeNames.map(
        async (name) => [name, await findOrCreatePayee(name, renamingRules)] as const,
      ),
    ),
  );
  const autoCategoryByPayeeId = await getPayeeAutoCategoryMap(budgetId, [
    ...new Set(payeeIdByName.values()),
  ]);

  let imported = 0;
  let skipped = 0;
  let firstCreatedId: string | undefined;
  await prisma.$transaction(async (tx) => {
    for (const row of parsedRows) {
      const isDuplicate = existing.some(
        (e) =>
          e.postDate.getTime() === row.date.getTime() &&
          Number(e.debit ?? 0) === (row.debit ?? 0) &&
          Number(e.credit ?? 0) === (row.credit ?? 0) &&
          payeesFuzzyMatch(e.payee.name, row.payeeName),
      );
      if (isDuplicate) {
        skipped += 1;
        continue;
      }

      const payeeId = payeeIdByName.get(row.payeeName)!;
      const mappedCategoryId = row.category
        ? (categoryByName.get(row.category.toLowerCase()) ?? null)
        : null;
      const categoryId = mappedCategoryId ?? autoCategoryByPayeeId.get(payeeId) ?? null;

      const created = await tx.transaction.create({
        data: {
          accountId,
          postDate: row.date,
          payeeId,
          categoryId,
          memo: row.memo?.trim() || null,
          debit: row.debit || null,
          credit: row.credit || null,
          cleared: true,
          pendingApproval: true,
        },
      });
      firstCreatedId ??= created.id;
      imported += 1;
    }
  });

  if (imported > 0 && firstCreatedId) {
    await logAudit({
      budgetId,
      userId,
      action: "create",
      entityType: "Transaction",
      entityId: firstCreatedId,
      summary:
        imported === 1
          ? `Imported 1 transaction from CSV on '${accountName}'`
          : `Imported ${imported} transactions from CSV on '${accountName}'`,
    });
  }
  revalidatePath(`/accounts/${accountId}`);
  return { imported, skipped, ignored };
}

export async function lookupPayeeAutoCategoryAction(
  accountId: string,
  payeeName: string,
): Promise<string | null> {
  const { account } = await assertAccountViewable(accountId);

  const trimmed = payeeName.trim();
  if (!trimmed) return null;

  const payee = await prisma.payee.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (!payee) return null;

  const map = await getPayeeAutoCategoryMap(account.budgetId, [payee.id]);
  return map.get(payee.id) ?? null;
}
