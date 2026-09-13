"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { logAudit } from "@/lib/auditLog";
import { isValidYearMonth, shiftYearMonth } from "@/lib/month";
import { computeCategoryActivity } from "@/lib/budgetRecalc";
import { remainingMonthlyTargetAmount } from "@/lib/categoryTarget";

export interface FormResult {
  error?: string;
}

async function requireEditAccess() {
  const { user, workspace, level } = await requireFeature(Feature.budget_envelope);
  if (level !== "edit") throw new Error("budget.errors.readOnly");
  return { workspace, userId: user.id };
}

async function assertOwnCategory(categoryId: string, budgetId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { section: true },
  });
  if (!category || category.section.budgetId !== budgetId) {
    throw new Error("budget.errors.categoryNotFound");
  }
  return category;
}

function assertValidMonth(month: string) {
  if (!isValidYearMonth(month)) throw new Error("budget.errors.invalidMonth");
}

function revalidate() {
  revalidatePath("/budget");
}

async function priorMonthAvailable(categoryId: string, month: string): Promise<number> {
  const priorMonth = shiftYearMonth(month, -1);
  const prior = await prisma.categoryAssignment.findUnique({
    where: { categoryId_month: { categoryId, month: priorMonth } },
  });
  return prior ? Number(prior.available) : 0;
}

async function currentMonthActivity(categoryId: string, month: string): Promise<number> {
  const existing = await prisma.categoryAssignment.findUnique({
    where: { categoryId_month: { categoryId, month } },
  });
  return existing ? Number(existing.activity) : await computeCategoryActivity(categoryId, month);
}

const assignedSchema = z.coerce.number().finite();

export async function updateAssignedAction(
  categoryId: string,
  month: string,
  assigned: number,
): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    assertValidMonth(month);
    const category = await assertOwnCategory(categoryId, workspace.budget.id);
    const parsed = assignedSchema.safeParse(assigned);
    if (!parsed.success) return { error: "budget.errors.invalidAssigned" };

    const [carryover, activity] = await Promise.all([
      priorMonthAvailable(categoryId, month),
      currentMonthActivity(categoryId, month),
    ]);
    const available = parsed.data + carryover + activity;

    await prisma.categoryAssignment.upsert({
      where: { categoryId_month: { categoryId, month } },
      create: { categoryId, month, assigned: parsed.data, carryover, activity, available },
      update: { assigned: parsed.data, carryover, activity, available },
    });

    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "CategoryAssignment",
      entityId: categoryId,
      summary: `Assigned $${parsed.data.toFixed(2)} to '${category.name}' for ${month}`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function createMissingAssignmentsAction(month: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    assertValidMonth(month);

    const missing = await prisma.category.findMany({
      where: {
        section: { budgetId: workspace.budget.id, isIncome: false, isCreditCardPayment: false },
        isActive: true,
        hideFromBudget: false,
        NOT: { assignments: { some: { month } } },
      },
    });
    if (missing.length === 0) return {};

    const rows = await Promise.all(
      missing.map(async (c) => {
        const [carryover, activity] = await Promise.all([
          priorMonthAvailable(c.id, month),
          computeCategoryActivity(c.id, month),
        ]);
        return { categoryId: c.id, carryover, activity, available: carryover + activity };
      }),
    );

    await prisma.$transaction(
      rows.map((r) =>
        prisma.categoryAssignment.create({
          data: {
            categoryId: r.categoryId,
            month,
            assigned: 0,
            carryover: r.carryover,
            activity: r.activity,
            available: r.available,
          },
        }),
      ),
    );

    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "create",
      entityType: "CategoryAssignment",
      entityId: rows[0].categoryId,
      summary: `Created ${rows.length} missing assignment${rows.length === 1 ? "" : "s"} for ${month}`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const AUTO_ASSIGN_MODES = ["underfunded", "resetAvailableToZero", "resetAssignedToZero"] as const;
export type AutoAssignMode = (typeof AUTO_ASSIGN_MODES)[number];

export async function autoAssignAction(
  month: string,
  categoryIds: string[],
  mode: AutoAssignMode,
): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    assertValidMonth(month);
    if (!AUTO_ASSIGN_MODES.includes(mode)) return { error: "budget.errors.invalidAutoAssignMode" };
    if (categoryIds.length === 0) return {};

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds }, section: { budgetId: workspace.budget.id } },
    });
    if (categories.length !== categoryIds.length)
      return { error: "budget.errors.categoryNotFound" };

    const rows = await Promise.all(
      categories.map(async (c) => {
        const [existing, carryover, activity] = await Promise.all([
          prisma.categoryAssignment.findUnique({
            where: { categoryId_month: { categoryId: c.id, month } },
          }),
          priorMonthAvailable(c.id, month),
          currentMonthActivity(c.id, month),
        ]);
        const currentAssigned = existing ? Number(existing.assigned) : 0;

        let assigned = currentAssigned;
        if (mode === "underfunded") {
          const target = remainingMonthlyTargetAmount(
            {
              targetAmount: c.targetAmount != null ? Number(c.targetAmount) : null,
              targetRepeatType: c.targetRepeatType,
              savingsPerMonth: c.savingsPerMonth != null ? Number(c.savingsPerMonth) : null,
              savingsPerQuarter: c.savingsPerQuarter != null ? Number(c.savingsPerQuarter) : null,
              savingsPerYear: c.savingsPerYear != null ? Number(c.savingsPerYear) : null,
              startDate: c.startDate ? c.startDate.toISOString() : null,
              targetDueDate: c.targetDueDate ? c.targetDueDate.toISOString() : null,
            },
            c.monthNeededBy,
            c.monthlyFundingGoal,
            carryover,
            month,
          );
          assigned = Math.max(currentAssigned, target);
        } else if (mode === "resetAvailableToZero") {
          assigned = -(carryover + activity);
        } else {
          assigned = 0;
        }

        return {
          categoryId: c.id,
          assigned,
          carryover,
          activity,
          available: assigned + carryover + activity,
        };
      }),
    );

    await prisma.$transaction(
      rows.map((r) =>
        prisma.categoryAssignment.upsert({
          where: { categoryId_month: { categoryId: r.categoryId, month } },
          create: {
            categoryId: r.categoryId,
            month,
            assigned: r.assigned,
            carryover: r.carryover,
            activity: r.activity,
            available: r.available,
          },
          update: {
            assigned: r.assigned,
            carryover: r.carryover,
            activity: r.activity,
            available: r.available,
          },
        }),
      ),
    );

    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "CategoryAssignment",
      entityId: rows[0].categoryId,
      summary: `Auto Assign '${mode}' applied to ${rows.length} categor${rows.length === 1 ? "y" : "ies"} for ${month}`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function toggleFavoriteCategoryAction(categoryId: string): Promise<FormResult> {
  try {
    const { user, workspace } = await requireFeature(Feature.budget_envelope);
    await assertOwnCategory(categoryId, workspace.budget.id);

    const existing = await prisma.favoriteCategory.findUnique({
      where: { userId_categoryId: { userId: user.id, categoryId } },
    });
    if (existing) {
      await prisma.favoriteCategory.delete({ where: { id: existing.id } });
    } else {
      await prisma.favoriteCategory.create({ data: { userId: user.id, categoryId } });
    }
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
