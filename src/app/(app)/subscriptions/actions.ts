"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature, SubscriptionCadence, SubscriptionStatus } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { findOrCreatePayee } from "@/lib/transactions";
import { stripAmountFormatting } from "@/lib/amount";
import { logAudit } from "@/lib/auditLog";

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

const subscriptionSchema = z.object({
  name: z.string().min(1, "subscriptions.errors.nameRequired"),
  payeeName: z.string().min(1, "subscriptions.errors.payeeRequired"),
  website: z.string().optional(),
  cadence: z.enum(SubscriptionCadence, "subscriptions.errors.invalidCadence"),
  intervalWeeks: z.coerce.number().int().min(1).optional(),
  amount: amountField(0.01),
  renewalDate: z.string().min(1, "subscriptions.errors.renewalDateRequired"),
  autoRenew: z.enum(["on"]).optional(),
  accountId: z.string().min(1, "subscriptions.errors.accountRequired"),
  categoryId: z.string().optional(),
  status: z.enum(SubscriptionStatus),
  trialEndDate: z.string().optional(),
  notes: z.string().optional(),
});

async function requireEditAccess() {
  const { user, workspace, level } = await requireFeature(Feature.subscriptions);
  if (level !== "edit") throw new Error("subscriptions.errors.readOnly");
  return { workspace, userId: user.id };
}

async function assertAccountInBudget(accountId: string, budgetId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.budgetId !== budgetId) {
    throw new Error("subscriptions.errors.accountNotFound");
  }
  return account;
}

async function assertOwnSubscription(id: string, budgetId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub || sub.budgetId !== budgetId) throw new Error("subscriptions.errors.notFound");
  return sub;
}

function revalidate() {
  revalidatePath("/subscriptions");
}

function cadenceToRepeatType(cadence: SubscriptionCadence) {
  switch (cadence) {
    case "every_n_weeks":
      return "every_n_weeks" as const;
    case "quarterly":
      return "every_3_months" as const;
    case "monthly":
      return "monthly" as const;
    case "yearly":
      return "yearly" as const;
  }
}

export async function createSubscriptionAction(
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

  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.cadence === "every_n_weeks" && !parsed.data.intervalWeeks) {
    return { error: "subscriptions.errors.intervalWeeksRequired" };
  }

  let account;
  try {
    account = await assertAccountInBudget(parsed.data.accountId, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const payeeId = await findOrCreatePayee(parsed.data.payeeName);

  const repeating = await prisma.repeatingTransaction.create({
    data: {
      accountId: parsed.data.accountId,
      payeeId,
      categoryId: parsed.data.categoryId || null,
      debit: parsed.data.amount,
      repeatType: cadenceToRepeatType(parsed.data.cadence),
      intervalWeeks: parsed.data.cadence === "every_n_weeks" ? parsed.data.intervalWeeks : null,
      nextOccurrenceDate: new Date(parsed.data.renewalDate),
      subscription: {
        create: {
          budgetId,
          name: parsed.data.name,
          website: parsed.data.website || null,
          cadence: parsed.data.cadence,
          intervalWeeks: parsed.data.cadence === "every_n_weeks" ? parsed.data.intervalWeeks : null,
          amount: parsed.data.amount,
          renewalDate: new Date(parsed.data.renewalDate),
          autoRenew: parsed.data.autoRenew === "on",
          accountId: parsed.data.accountId,
          categoryId: parsed.data.categoryId || null,
          status: parsed.data.status,
          trialEndDate: parsed.data.trialEndDate ? new Date(parsed.data.trialEndDate) : null,
          notes: parsed.data.notes || null,
        },
      },
    },
    include: { subscription: true },
  });

  if (repeating.subscription) {
    await logAudit({
      budgetId,
      userId,
      action: "create",
      entityType: "Subscription",
      entityId: repeating.subscription.id,
      summary: `Created subscription '${parsed.data.name}' on '${account.name}'`,
    });
  }

  revalidate();
  return {};
}

export async function updateSubscriptionAction(
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

  let existing;
  try {
    existing = await assertOwnSubscription(id, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.cadence === "every_n_weeks" && !parsed.data.intervalWeeks) {
    return { error: "subscriptions.errors.intervalWeeksRequired" };
  }

  let account;
  try {
    account = await assertAccountInBudget(parsed.data.accountId, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  const payeeId = await findOrCreatePayee(parsed.data.payeeName);
  const intervalWeeks = parsed.data.cadence === "every_n_weeks" ? parsed.data.intervalWeeks : null;

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id },
      data: {
        name: parsed.data.name,
        website: parsed.data.website || null,
        cadence: parsed.data.cadence,
        intervalWeeks,
        amount: parsed.data.amount,
        renewalDate: new Date(parsed.data.renewalDate),
        autoRenew: parsed.data.autoRenew === "on",
        accountId: parsed.data.accountId,
        categoryId: parsed.data.categoryId || null,
        status: parsed.data.status,
        trialEndDate: parsed.data.trialEndDate ? new Date(parsed.data.trialEndDate) : null,
        notes: parsed.data.notes || null,
      },
    }),
    prisma.repeatingTransaction.update({
      where: { id: existing.repeatingTransactionId },
      data: {
        accountId: parsed.data.accountId,
        payeeId,
        categoryId: parsed.data.categoryId || null,
        debit: parsed.data.amount,
        repeatType: cadenceToRepeatType(parsed.data.cadence),
        intervalWeeks,
        nextOccurrenceDate: new Date(parsed.data.renewalDate),
        isActive: parsed.data.status === "active",
      },
    }),
  ]);

  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Subscription",
    entityId: id,
    summary: `Updated subscription '${existing.name}' on '${account.name}'`,
  });

  revalidate();
  return {};
}

export async function updateSubscriptionStatusAction(
  id: string,
  status: SubscriptionStatus,
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

  let existing;
  try {
    existing = await assertOwnSubscription(id, budgetId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }

  await prisma.$transaction([
    prisma.subscription.update({ where: { id }, data: { status } }),
    prisma.repeatingTransaction.update({
      where: { id: existing.repeatingTransactionId },
      data: { isActive: status === "active" },
    }),
  ]);

  await logAudit({
    budgetId,
    userId,
    action: "update",
    entityType: "Subscription",
    entityId: id,
    summary: `Changed status for subscription '${existing.name}' to ${status}`,
  });

  revalidate();
  return {};
}
