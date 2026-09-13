"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature, MonthlyFundingGoal, Prisma, TargetRepeatType } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { logAudit } from "@/lib/auditLog";

export interface FormResult {
  error?: string;
}

async function requireEditAccess() {
  const { user, workspace, level } = await requireFeature(Feature.plan);
  if (level !== "edit") throw new Error("plan.errors.readOnly");
  return { workspace, userId: user.id };
}

async function assertOwnCategory(categoryId: string, budgetId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { section: true },
  });
  if (!category || category.section.budgetId !== budgetId) {
    throw new Error("plan.errors.categoryNotFound");
  }
  return category;
}

function revalidate() {
  revalidatePath("/plan");
}

function optionalNumber() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.number().finite().optional(),
  );
}

function optionalInt() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.number().int().optional(),
  );
}

const targetSchema = z.object({
  targetRepeatType: z.enum([...Object.values(TargetRepeatType), "none"]),
  targetAmount: optionalNumber(),
  savingsPerMonth: optionalNumber(),
  dayOfMonth: optionalInt(),
  monthlyFundingGoal: z.enum(MonthlyFundingGoal).optional(),
  savingsPerQuarter: optionalNumber(),
  quarterlyMonths: z.string().optional(),
  savingsPerYear: optionalNumber(),
  monthNeededBy: z.string().optional(),
  startDate: z.string().optional(),
  targetDueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function updateCategoryTargetAction(
  categoryId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const category = await assertOwnCategory(categoryId, workspace.budget.id);

    const parsed = targetSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const d = parsed.data;

    if (d.targetRepeatType === "none") {
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          targetRepeatType: null,
          targetAmount: d.targetAmount ?? null,
          savingsPerMonth: null,
          dayOfMonth: null,
          monthlyFundingGoal: null,
          savingsPerQuarter: null,
          quarterlyMonths: Prisma.JsonNull,
          savingsPerYear: null,
          monthNeededBy: null,
          startDate: null,
          targetDueDate: null,
          notes: d.notes || null,
        },
      });
    } else if (d.targetRepeatType === "monthly") {
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          targetRepeatType: "monthly",
          targetAmount: null,
          savingsPerMonth: d.savingsPerMonth ?? 0,
          dayOfMonth: d.dayOfMonth ?? 1,
          monthlyFundingGoal: d.monthlyFundingGoal ?? "reach_target",
          savingsPerQuarter: null,
          quarterlyMonths: Prisma.JsonNull,
          savingsPerYear: null,
          monthNeededBy: null,
          startDate: null,
          targetDueDate: null,
          notes: d.notes || null,
        },
      });
    } else if (d.targetRepeatType === "quarterly") {
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          targetRepeatType: "quarterly",
          targetAmount: null,
          savingsPerMonth: null,
          dayOfMonth: null,
          monthlyFundingGoal: null,
          savingsPerQuarter: d.savingsPerQuarter ?? 0,
          quarterlyMonths: d.quarterlyMonths ? JSON.parse(d.quarterlyMonths) : [],
          savingsPerYear: null,
          monthNeededBy: null,
          startDate: null,
          targetDueDate: null,
          notes: d.notes || null,
        },
      });
    } else if (d.targetRepeatType === "yearly") {
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          targetRepeatType: "yearly",
          targetAmount: null,
          savingsPerMonth: null,
          dayOfMonth: null,
          monthlyFundingGoal: null,
          savingsPerQuarter: null,
          quarterlyMonths: Prisma.JsonNull,
          savingsPerYear: d.savingsPerYear ?? 0,
          monthNeededBy: d.monthNeededBy ?? "0",
          startDate: null,
          targetDueDate: null,
          notes: d.notes || null,
        },
      });
    } else {
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          targetRepeatType: "long_term",
          targetAmount: d.targetAmount ?? 0,
          savingsPerMonth: null,
          dayOfMonth: null,
          monthlyFundingGoal: null,
          savingsPerQuarter: null,
          quarterlyMonths: Prisma.JsonNull,
          savingsPerYear: null,
          monthNeededBy: null,
          startDate: d.startDate ? new Date(d.startDate) : null,
          targetDueDate: d.targetDueDate ? new Date(d.targetDueDate) : null,
          notes: d.notes || null,
        },
      });
    }

    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Category",
      entityId: categoryId,
      summary: `Set target for category '${category.name}' (${d.targetRepeatType})`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function clearCategoryTargetAction(categoryId: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const category = await assertOwnCategory(categoryId, workspace.budget.id);

    await prisma.category.update({
      where: { id: categoryId },
      data: {
        targetRepeatType: null,
        targetAmount: null,
        savingsPerMonth: null,
        dayOfMonth: null,
        monthlyFundingGoal: null,
        savingsPerQuarter: null,
        quarterlyMonths: Prisma.JsonNull,
        savingsPerYear: null,
        monthNeededBy: null,
        startDate: null,
        targetDueDate: null,
      },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Category",
      entityId: categoryId,
      summary: `Cleared target for category '${category.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
