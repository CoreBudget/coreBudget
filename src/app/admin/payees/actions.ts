"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { PayeeMatchType } from "@/generated/prisma/client";

export interface FormResult {
  error?: string;
  message?: string;
}

const createPayeeSchema = z.object({
  name: z.string().min(1, "admin.payees.errors.nameRequired"),
  includeInList: z.enum(["on"]).optional(),
  enableAutoCategory: z.enum(["on"]).optional(),
});

export async function createPayeeAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = createPayeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const existing = await prisma.payee.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) {
    return {
      error: JSON.stringify({
        key: "admin.payees.errors.nameExists",
        params: { name: existing.name },
      }),
    };
  }

  await prisma.payee.create({
    data: {
      name: parsed.data.name,
      includeInList: parsed.data.includeInList === "on",
      enableAutoCategory: parsed.data.enableAutoCategory === "on",
    },
  });

  return { message: "admin.payees.messages.created" };
}

const updatePayeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "admin.payees.errors.nameRequired"),
  includeInList: z.enum(["on"]).optional(),
  enableAutoCategory: z.enum(["on"]).optional(),
});

export async function updatePayeeAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = updatePayeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await prisma.payee.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      includeInList: parsed.data.includeInList === "on",
      enableAutoCategory: parsed.data.enableAutoCategory === "on",
    },
  });

  return {};
}

export async function deletePayeeAction(id: string): Promise<FormResult> {
  await requireAdmin();

  const [txnCount, splitCount, repeatingCount] = await Promise.all([
    prisma.transaction.count({ where: { payeeId: id } }),
    prisma.transactionSplit.count({ where: { transaction: { payeeId: id } } }),
    prisma.repeatingTransaction.count({ where: { payeeId: id } }),
  ]);
  if (txnCount > 0 || splitCount > 0 || repeatingCount > 0) {
    return { error: "admin.payees.errors.hasHistory" };
  }

  await prisma.payee.delete({ where: { id } });
  return {};
}

export async function mergePayeeAction(sourceId: string, targetId: string): Promise<FormResult> {
  await requireAdmin();
  if (sourceId === targetId) {
    return { error: "admin.payees.errors.mergeSameTarget" };
  }

  const source = await prisma.payee.findUnique({ where: { id: sourceId } });
  if (!source) {
    return { error: "admin.payees.errors.payeeNotFound" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({ where: { payeeId: sourceId }, data: { payeeId: targetId } });
    await tx.repeatingTransaction.updateMany({
      where: { payeeId: sourceId },
      data: { payeeId: targetId },
    });
    await tx.payeeRenamingRule.updateMany({
      where: { payeeId: sourceId },
      data: { payeeId: targetId },
    });
    const targetBudgetIds = (
      await tx.payeeAutoCategory.findMany({
        where: { payeeId: targetId },
        select: { budgetId: true },
      })
    ).map((m) => m.budgetId);
    await tx.payeeAutoCategory.deleteMany({
      where: { payeeId: sourceId, budgetId: { in: targetBudgetIds } },
    });
    await tx.payeeAutoCategory.updateMany({
      where: { payeeId: sourceId },
      data: { payeeId: targetId },
    });
    await tx.payee.delete({ where: { id: sourceId } });

    const existingRule = await tx.payeeRenamingRule.findFirst({
      where: { payeeId: targetId, matchType: "equals", pattern: source.name },
    });
    if (!existingRule) {
      await tx.payeeRenamingRule.create({
        data: { payeeId: targetId, matchType: "equals", pattern: source.name },
      });
    }
  });

  return {};
}

const ruleSchema = z.object({
  payeeId: z.string().min(1),
  matchType: z.enum(PayeeMatchType),
  pattern: z.string().min(1, "admin.payees.errors.patternRequired"),
});

export async function addRenamingRuleAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = ruleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  await prisma.payeeRenamingRule.create({ data: parsed.data });
  return {};
}

const updateRuleSchema = z.object({
  id: z.string().min(1),
  matchType: z.enum(PayeeMatchType),
  pattern: z.string().min(1, "admin.payees.errors.patternRequired"),
});

export async function updateRenamingRuleAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = updateRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  await prisma.payeeRenamingRule.update({
    where: { id: parsed.data.id },
    data: { matchType: parsed.data.matchType, pattern: parsed.data.pattern },
  });
  return {};
}

export async function deleteRenamingRuleAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.payeeRenamingRule.delete({ where: { id } });
}
