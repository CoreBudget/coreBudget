"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";

export interface FormResult {
  error?: string;
}

async function requireEditAccess() {
  const { workspace, level } = await requireFeature(Feature.budget_settings);
  if (level !== "edit") throw new Error("budgetSettings.errors.readOnly");
  return workspace;
}

async function assertCategoryInBudget(categoryId: string, budgetId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { section: true },
  });
  if (!category || category.section.budgetId !== budgetId) {
    throw new Error("budgetSettings.errors.categoryNotFound");
  }
  return category;
}

function revalidate() {
  revalidatePath("/budget-settings");
}

const mappingSchema = z.object({
  payeeId: z.string().min(1, "budgetSettings.payeeCategorization.errors.payeeRequired"),
  categoryId: z.string().min(1, "budgetSettings.payeeCategorization.errors.categoryRequired"),
});

export async function setPayeeAutoCategoryAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess();
    const parsed = mappingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const payee = await prisma.payee.findUnique({ where: { id: parsed.data.payeeId } });
    if (!payee) return { error: "budgetSettings.payeeCategorization.errors.payeeNotFound" };
    await assertCategoryInBudget(parsed.data.categoryId, workspace.budget.id);

    await prisma.payeeAutoCategory.upsert({
      where: {
        payeeId_budgetId: { payeeId: parsed.data.payeeId, budgetId: workspace.budget.id },
      },
      create: {
        payeeId: parsed.data.payeeId,
        budgetId: workspace.budget.id,
        categoryId: parsed.data.categoryId,
      },
      update: { categoryId: parsed.data.categoryId },
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deletePayeeAutoCategoryAction(payeeId: string): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess();
    await prisma.payeeAutoCategory.deleteMany({
      where: { payeeId, budgetId: workspace.budget.id },
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
