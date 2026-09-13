"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { Feature, PermissionLevel } from "@/generated/prisma/client";
import { logAudit } from "@/lib/auditLog";
import { PER_BUDGET_FEATURES } from "./featureLabels";

export interface FormResult {
  error?: string;
}

const createHouseholdSchema = z.object({
  name: z.string().min(1, "admin.households.errors.nameRequired"),
  ownerUserId: z.string().min(1, "admin.households.errors.ownerRequired"),
});

export async function createHouseholdAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = createHouseholdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await prisma.household.create({
    data: {
      name: parsed.data.name,
      access: { create: { userId: parsed.data.ownerUserId, role: "owner" } },
    },
  });

  return {};
}

const grantHouseholdSchema = z.object({
  householdId: z.string().min(1),
  userId: z.string().min(1, "admin.households.errors.userRequired"),
  role: z.enum(["owner", "member"]),
});

export async function grantHouseholdAccessAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = grantHouseholdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await prisma.householdAccess.upsert({
    where: {
      userId_householdId: { userId: parsed.data.userId, householdId: parsed.data.householdId },
    },
    create: parsed.data,
    update: { role: parsed.data.role },
  });

  return {};
}

export async function updateMemberRoleAction(
  householdId: string,
  userId: string,
  role: "owner" | "member",
): Promise<void> {
  await requireAdmin();
  await prisma.householdAccess.update({
    where: { userId_householdId: { userId, householdId } },
    data: { role },
  });
}

export async function removeHouseholdMemberAction(
  householdId: string,
  userId: string,
): Promise<void> {
  await requireAdmin();
  const budgetIds = (
    await prisma.budget.findMany({ where: { householdId }, select: { id: true } })
  ).map((b) => b.id);

  await prisma.$transaction([
    prisma.featurePermission.deleteMany({ where: { userId, budgetId: { in: budgetIds } } }),
    prisma.budgetAccess.deleteMany({ where: { userId, budgetId: { in: budgetIds } } }),
    prisma.householdAccess.delete({ where: { userId_householdId: { userId, householdId } } }),
  ]);
}

export async function grantBudgetAccessAction(budgetId: string, userId: string): Promise<void> {
  const admin = await requireAdmin();
  const [budget, user] = await Promise.all([
    prisma.budget.findUnique({ where: { id: budgetId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  await prisma.budgetAccess.upsert({
    where: { userId_budgetId: { userId, budgetId } },
    create: { userId, budgetId },
    update: {},
  });
  await logAudit({
    budgetId,
    userId: admin.id,
    action: "create",
    entityType: "BudgetAccess",
    entityId: userId,
    summary: `Granted '${user?.name ?? "a user"}' access to budget '${budget?.name ?? budgetId}'`,
  });
}

export async function revokeBudgetAccessAction(budgetId: string, userId: string): Promise<void> {
  const admin = await requireAdmin();
  const [budget, user] = await Promise.all([
    prisma.budget.findUnique({ where: { id: budgetId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);
  await prisma.$transaction([
    prisma.featurePermission.deleteMany({ where: { userId, budgetId } }),
    prisma.budgetAccess.delete({ where: { userId_budgetId: { userId, budgetId } } }),
  ]);
  await logAudit({
    budgetId,
    userId: admin.id,
    action: "delete",
    entityType: "BudgetAccess",
    entityId: userId,
    summary: `Revoked '${user?.name ?? "a user"}'s access to budget '${budget?.name ?? budgetId}'`,
  });
}

const permissionsSchema = z.record(z.enum(PER_BUDGET_FEATURES), z.enum(PermissionLevel));

export async function savePermissionsAction(
  budgetId: string,
  userId: string,
  permissions: Record<string, string>,
): Promise<void> {
  const admin = await requireAdmin();
  const parsed = permissionsSchema.parse(permissions);
  const [budget, user] = await Promise.all([
    prisma.budget.findUnique({ where: { id: budgetId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  await prisma.$transaction(
    Object.entries(parsed).map(([feature, level]) =>
      prisma.featurePermission.upsert({
        where: { userId_budgetId_feature: { userId, budgetId, feature: feature as Feature } },
        create: { userId, budgetId, feature: feature as Feature, level },
        update: { level },
      }),
    ),
  );
  await logAudit({
    budgetId,
    userId: admin.id,
    action: "update",
    entityType: "FeaturePermission",
    entityId: userId,
    summary: `Updated feature permissions for '${user?.name ?? "a user"}' on budget '${budget?.name ?? budgetId}': ${Object.entries(
      parsed,
    )
      .map(([feature, level]) => `${feature}=${level}`)
      .join(", ")}`,
  });
}
