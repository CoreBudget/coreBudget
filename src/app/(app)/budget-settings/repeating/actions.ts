"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { findOrCreatePayee } from "@/lib/transactions";
import { stripAmountFormatting } from "@/lib/amount";
import { logAudit } from "@/lib/auditLog";
import { CADENCE_OPTIONS, cadenceToRepeatType } from "./cadence";

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

const repeatingTxnSchema = z.object({
  accountId: z.string().min(1, "budgetSettings.repeating.errors.accountRequired"),
  payeeName: z.string().min(1, "budgetSettings.repeating.errors.payeeRequired"),
  categoryId: z.string().optional(),
  memo: z.string().optional(),
  debit: amountField(0).optional(),
  credit: amountField(0).optional(),
  cadence: z.enum(CADENCE_OPTIONS, "budgetSettings.repeating.errors.invalidCadence"),
  nextOccurrenceDate: z.string().min(1, "budgetSettings.repeating.errors.dateRequired"),
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

function validateAmounts(debit?: number, credit?: number): string | null {
  const hasDebit = !!debit;
  const hasCredit = !!credit;
  if (hasDebit && hasCredit) return "transactions.errors.onlyOneAmount";
  if (!hasDebit && !hasCredit) return "transactions.errors.amountRequired";
  return null;
}

async function requireEditAccess() {
  const { user, workspace, level } = await requireFeature(Feature.repeating_transactions);
  if (level !== "edit") throw new Error("budgetSettings.repeating.errors.readOnly");
  return { workspace, userId: user.id };
}

async function assertAccountInBudget(accountId: string, budgetId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.budgetId !== budgetId) {
    throw new Error("budgetSettings.repeating.errors.accountNotFound");
  }
  return account;
}

async function assertOwnRepeatingTransaction(id: string, budgetId: string) {
  const rt = await prisma.repeatingTransaction.findUnique({
    where: { id },
    include: {
      account: true,
      subscription: true,
      _count: { select: { generatedTransactions: true } },
    },
  });
  if (!rt || rt.account.budgetId !== budgetId) {
    throw new Error("budgetSettings.repeating.errors.notFound");
  }
  if (rt.subscription) {
    throw new Error("budgetSettings.repeating.errors.managedBySubscription");
  }
  return rt;
}

function revalidate() {
  revalidatePath("/budget-settings/repeating");
}

export async function createRepeatingTransactionAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  try {
    ({
      workspace: {
        budget: { id: budgetId },
      },
      userId,
    } = await requireEditAccess());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const parsed = repeatingTxnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let account;
  try {
    account = await assertAccountInBudget(parsed.data.accountId, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
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
  const { repeatType, intervalWeeks } = cadenceToRepeatType(parsed.data.cadence);

  const repeating = await prisma.repeatingTransaction.create({
    data: {
      accountId: parsed.data.accountId,
      payeeId,
      categoryId: splits ? null : parsed.data.categoryId || null,
      memo: parsed.data.memo || null,
      debit: parsed.data.debit || null,
      credit: parsed.data.credit || null,
      repeatType,
      intervalWeeks,
      nextOccurrenceDate: new Date(parsed.data.nextOccurrenceDate),
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

  await logAudit({
    budgetId,
    userId,
    action: "create",
    entityType: "RepeatingTransaction",
    entityId: repeating.id,
    summary: `Created repeating transaction to '${parsed.data.payeeName}' on '${account.name}'`,
  });
  revalidate();
  return {};
}

export async function updateRepeatingTransactionAction(
  id: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  try {
    ({
      workspace: {
        budget: { id: budgetId },
      },
      userId,
    } = await requireEditAccess());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  try {
    await assertOwnRepeatingTransaction(id, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const parsed = repeatingTxnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let account;
  try {
    account = await assertAccountInBudget(parsed.data.accountId, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
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
  const { repeatType, intervalWeeks } = cadenceToRepeatType(parsed.data.cadence);

  await prisma.$transaction([
    prisma.repeatingTransactionSplit.deleteMany({ where: { repeatingTransactionId: id } }),
    prisma.repeatingTransaction.update({
      where: { id },
      data: {
        accountId: parsed.data.accountId,
        payeeId,
        categoryId: splits ? null : parsed.data.categoryId || null,
        memo: parsed.data.memo || null,
        debit: parsed.data.debit || null,
        credit: parsed.data.credit || null,
        repeatType,
        intervalWeeks,
        nextOccurrenceDate: new Date(parsed.data.nextOccurrenceDate),
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

  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "RepeatingTransaction",
    entityId: id,
    summary: `Edited repeating transaction to '${parsed.data.payeeName}' on '${account.name}'`,
  });
  revalidate();
  return {};
}

export async function updateNextOccurrenceDateAction(
  id: string,
  nextOccurrenceDate: string,
): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  try {
    ({
      workspace: {
        budget: { id: budgetId },
      },
      userId,
    } = await requireEditAccess());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  if (!nextOccurrenceDate) return { error: "budgetSettings.repeating.errors.dateRequired" };

  const rt = await prisma.repeatingTransaction.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!rt || rt.account.budgetId !== budgetId) {
    return { error: "budgetSettings.repeating.errors.notFound" };
  }

  await prisma.repeatingTransaction.update({
    where: { id },
    data: { nextOccurrenceDate: new Date(nextOccurrenceDate) },
  });

  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "RepeatingTransaction",
    entityId: id,
    summary: `Updated next occurrence date for a repeating transaction on '${rt.account.name}'`,
  });
  revalidate();
  return {};
}

export async function toggleActiveRepeatingTransactionAction(id: string): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  try {
    ({
      workspace: {
        budget: { id: budgetId },
      },
      userId,
    } = await requireEditAccess());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  let rt;
  try {
    rt = await assertOwnRepeatingTransaction(id, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const nextActive = !rt.isActive;
  await prisma.repeatingTransaction.update({
    where: { id },
    data: { isActive: nextActive },
  });

  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "RepeatingTransaction",
    entityId: id,
    summary: `${nextActive ? "Activated" : "Paused"} a repeating transaction on '${rt.account.name}'`,
  });
  revalidate();
  return {};
}

export async function deleteRepeatingTransactionAction(id: string): Promise<FormResult> {
  let budgetId: string;
  let userId: string;
  try {
    ({
      workspace: {
        budget: { id: budgetId },
      },
      userId,
    } = await requireEditAccess());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  let rt;
  try {
    rt = await assertOwnRepeatingTransaction(id, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  if (rt._count.generatedTransactions > 0) {
    return { error: "budgetSettings.repeating.errors.hasHistory" };
  }

  await prisma.repeatingTransaction.delete({ where: { id } });
  await logAudit({
    budgetId,
    userId,
    action: "delete",
    entityType: "RepeatingTransaction",
    entityId: id,
    summary: `Deleted a repeating transaction on '${rt.account.name}'`,
  });
  revalidate();
  return {};
}
