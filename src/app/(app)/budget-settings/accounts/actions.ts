"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AccountType, Feature } from "@/generated/prisma/client";
import { CREDIT_TYPES, requireFeature } from "@/lib/workspace";
import { logAudit } from "@/lib/auditLog";

export interface FormResult {
  error?: string;
}

async function requireEditAccess() {
  const { user, workspace, level } = await requireFeature(Feature.budget_settings);
  if (level !== "edit") throw new Error("budgetSettings.errors.readOnly");
  return { workspace, userId: user.id };
}

async function assertAccountInBudget(accountId: string, budgetId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.budgetId !== budgetId) {
    throw new Error("budgetSettings.errors.accountNotFound");
  }
  return account;
}

async function assertAssetInBudget(assetId: string, budgetId: string) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.budgetId !== budgetId) {
    throw new Error("budgetSettings.errors.assetNotFound");
  }
  return asset;
}

async function assertLiabilityInBudget(liabilityId: string, budgetId: string) {
  const liability = await prisma.liability.findUnique({ where: { id: liabilityId } });
  if (!liability || liability.budgetId !== budgetId) {
    throw new Error("budgetSettings.errors.liabilityNotFound");
  }
  return liability;
}

function revalidate() {
  revalidatePath("/budget-settings");
}

const nameSchema = z.string().trim().min(1, "budgetSettings.errors.nameRequired");

export async function renameAccountAction(accountId: string, name: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const account = await assertAccountInBudget(accountId, workspace.budget.id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    await prisma.account.update({ where: { id: accountId }, data: { name: parsed.data } });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Account",
      entityId: accountId,
      summary: `Renamed account '${account.name}' to '${parsed.data}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function setAccountWebsiteAction(
  accountId: string,
  website: string,
): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const account = await assertAccountInBudget(accountId, workspace.budget.id);

    await prisma.account.update({
      where: { id: accountId },
      data: { website: website.trim() || null },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Account",
      entityId: accountId,
      summary: `Updated website for account '${account.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function setAccountTypeAction(accountId: string, type: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const account = await assertAccountInBudget(accountId, workspace.budget.id);
    if (!Object.values(AccountType).includes(type as AccountType)) {
      return { error: "budgetSettings.errors.invalidAccountType" };
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { type: type as AccountType },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Account",
      entityId: accountId,
      summary: `Changed type for account '${account.name}' to ${type}`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function setAccountPaymentDueDayAction(
  accountId: string,
  paymentDueDay: string,
): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const account = await assertAccountInBudget(accountId, workspace.budget.id);
    if (!CREDIT_TYPES.has(account.type)) {
      return { error: "budgetSettings.errors.accountNotFound" };
    }

    let day: number | null = null;
    if (paymentDueDay.trim() !== "") {
      day = Number(paymentDueDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return { error: "budgetSettings.errors.invalidPaymentDueDay" };
      }
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { paymentDueDay: day },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Account",
      entityId: accountId,
      summary: `Updated payment due day for account '${account.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

function parseCardExpiration(value: string): Date | null | undefined {
  if (!value.trim()) return null;
  const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const month = Number(match[1]);
  const year = Number(match[2]);
  return new Date(year, month, 0);
}

export async function setAccountCardExpirationAction(
  accountId: string,
  cardExpiration: string,
): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const account = await assertAccountInBudget(accountId, workspace.budget.id);
    if (account.type !== "credit") {
      return { error: "budgetSettings.errors.accountNotFound" };
    }

    const cardExpirationDate = parseCardExpiration(cardExpiration);
    if (cardExpirationDate === undefined) {
      return { error: "budgetSettings.errors.invalidCardExpiration" };
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { cardExpirationDate },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Account",
      entityId: accountId,
      summary: `Updated card expiration for account '${account.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function moveAccountAction(
  accountId: string,
  direction: "up" | "down",
): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const account = await assertAccountInBudget(accountId, workspace.budget.id);
    const isCredit = CREDIT_TYPES.has(account.type);
    const inGroup = Object.values(AccountType).filter((t) => CREDIT_TYPES.has(t) === isCredit);

    const neighbor = await prisma.account.findFirst({
      where: {
        budgetId: workspace.budget.id,
        type: { in: inGroup },
        order: direction === "up" ? { lt: account.order } : { gt: account.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return {};

    await prisma.$transaction([
      prisma.account.update({ where: { id: account.id }, data: { order: neighbor.order } }),
      prisma.account.update({ where: { id: neighbor.id }, data: { order: account.order } }),
    ]);
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function renameAssetAction(assetId: string, name: string): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    await assertAssetInBudget(assetId, workspace.budget.id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    await prisma.asset.update({ where: { id: assetId }, data: { name: parsed.data } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function renameLiabilityAction(
  liabilityId: string,
  name: string,
): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    await assertLiabilityInBudget(liabilityId, workspace.budget.id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    await prisma.liability.update({ where: { id: liabilityId }, data: { name: parsed.data } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function moveAssetAction(
  assetId: string,
  direction: "up" | "down",
): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const asset = await assertAssetInBudget(assetId, workspace.budget.id);

    const neighbor = await prisma.asset.findFirst({
      where: {
        budgetId: workspace.budget.id,
        order: direction === "up" ? { lt: asset.order } : { gt: asset.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return {};

    await prisma.$transaction([
      prisma.asset.update({ where: { id: asset.id }, data: { order: neighbor.order } }),
      prisma.asset.update({ where: { id: neighbor.id }, data: { order: asset.order } }),
    ]);
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function moveLiabilityAction(
  liabilityId: string,
  direction: "up" | "down",
): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const liability = await assertLiabilityInBudget(liabilityId, workspace.budget.id);

    const neighbor = await prisma.liability.findFirst({
      where: {
        budgetId: workspace.budget.id,
        order: direction === "up" ? { lt: liability.order } : { gt: liability.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return {};

    await prisma.$transaction([
      prisma.liability.update({ where: { id: liability.id }, data: { order: neighbor.order } }),
      prisma.liability.update({ where: { id: neighbor.id }, data: { order: liability.order } }),
    ]);
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
