import { prisma } from "@/lib/prisma";
import type { PlatformSettings } from "@/generated/prisma/client";

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const existing = await prisma.platformSettings.findFirst();
  if (existing) return existing;
  return prisma.platformSettings.create({ data: {} });
}

export type SetupStep = "admin" | "household" | "budget" | "account" | "invite";

export async function getSetupStep(): Promise<SetupStep | null> {
  const userCount = await prisma.user.count();
  if (userCount === 0) return "admin";

  const household = await prisma.household.findFirst();
  if (!household) return "household";

  const budget = await prisma.budget.findFirst({ where: { householdId: household.id } });
  if (!budget) return "budget";

  const account = await prisma.account.findFirst({ where: { budgetId: budget.id } });
  if (!account) return "account";

  return "invite";
}
