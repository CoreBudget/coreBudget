"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { logAudit } from "@/lib/auditLog";
import { SECTION_TYPES, sectionTypeFlags, type SectionType } from "./sectionType";

export interface FormResult {
  error?: string;
}

async function requireEditAccess() {
  const { user, workspace, level } = await requireFeature(Feature.budget_settings);
  if (level !== "edit") throw new Error("budgetSettings.errors.readOnly");
  return { workspace, userId: user.id };
}

async function assertSectionInBudget(sectionId: string, budgetId: string) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section || section.budgetId !== budgetId)
    throw new Error("budgetSettings.errors.sectionNotFound");
  return section;
}

async function assertCategoryInBudget(categoryId: string, budgetId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { section: true },
  });
  if (!category || category.section.budgetId !== budgetId)
    throw new Error("budgetSettings.errors.categoryNotFound");
  return category;
}

function revalidate() {
  revalidatePath("/budget-settings");
}

const nameSchema = z.string().trim().min(1, "budgetSettings.errors.nameRequired");

export async function createSectionAction(name: string): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const maxOrder = await prisma.section.aggregate({
      where: { budgetId: workspace.budget.id },
      _max: { order: true },
    });
    await prisma.section.create({
      data: {
        budgetId: workspace.budget.id,
        name: parsed.data,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function renameSectionAction(sectionId: string, name: string): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    await assertSectionInBudget(sectionId, workspace.budget.id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    await prisma.section.update({ where: { id: sectionId }, data: { name: parsed.data } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function setSectionTypeAction(sectionId: string, type: string): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    await assertSectionInBudget(sectionId, workspace.budget.id);
    if (!(SECTION_TYPES as readonly string[]).includes(type)) {
      return { error: "budgetSettings.errors.invalidSectionType" };
    }

    await prisma.section.update({
      where: { id: sectionId },
      data: sectionTypeFlags(type as SectionType),
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function toggleSectionActiveAction(sectionId: string): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const section = await assertSectionInBudget(sectionId, workspace.budget.id);
    await prisma.section.update({
      where: { id: sectionId },
      data: { isActive: !section.isActive },
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteSectionAction(sectionId: string): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    await assertSectionInBudget(sectionId, workspace.budget.id);

    const categoryCount = await prisma.category.count({ where: { sectionId } });
    if (categoryCount > 0) {
      return { error: "budgetSettings.errors.groupNotEmpty" };
    }

    await prisma.section.delete({ where: { id: sectionId } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function moveSectionAction(
  sectionId: string,
  direction: "up" | "down",
): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const section = await assertSectionInBudget(sectionId, workspace.budget.id);

    const neighbor = await prisma.section.findFirst({
      where: {
        budgetId: workspace.budget.id,
        order: direction === "up" ? { lt: section.order } : { gt: section.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return {};

    await prisma.$transaction([
      prisma.section.update({ where: { id: section.id }, data: { order: neighbor.order } }),
      prisma.section.update({ where: { id: neighbor.id }, data: { order: section.order } }),
    ]);
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function createCategoryAction(sectionId: string, name: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    await assertSectionInBudget(sectionId, workspace.budget.id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const maxOrder = await prisma.category.aggregate({
      where: { sectionId },
      _max: { order: true },
    });
    const category = await prisma.category.create({
      data: { sectionId, name: parsed.data, order: (maxOrder._max.order ?? -1) + 1 },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "create",
      entityType: "Category",
      entityId: category.id,
      summary: `Created category '${category.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function renameCategoryAction(categoryId: string, name: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const existing = await assertCategoryInBudget(categoryId, workspace.budget.id);
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    await prisma.category.update({ where: { id: categoryId }, data: { name: parsed.data } });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Category",
      entityId: categoryId,
      summary: `Renamed category '${existing.name}' to '${parsed.data}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function toggleCategoryActiveAction(categoryId: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const category = await assertCategoryInBudget(categoryId, workspace.budget.id);
    const nextActive = !category.isActive;
    await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: nextActive },
    });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "update",
      entityType: "Category",
      entityId: categoryId,
      summary: `${nextActive ? "Restored" : "Archived"} category '${category.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<FormResult> {
  try {
    const { workspace, userId } = await requireEditAccess();
    const category = await assertCategoryInBudget(categoryId, workspace.budget.id);

    const [nonZeroAssignments, txnCount, splitCount] = await Promise.all([
      prisma.categoryAssignment.count({
        where: {
          categoryId,
          OR: [{ assigned: { not: 0 } }, { activity: { not: 0 } }, { carryover: { not: 0 } }],
        },
      }),
      prisma.transaction.count({ where: { categoryId } }),
      prisma.transactionSplit.count({ where: { categoryId } }),
    ]);

    if (nonZeroAssignments > 0 || txnCount > 0 || splitCount > 0) {
      return { error: "budgetSettings.errors.categoryHasHistory" };
    }

    await prisma.category.delete({ where: { id: categoryId } });
    await logAudit({
      budgetId: workspace.budget.id,
      userId,
      action: "delete",
      entityType: "Category",
      entityId: categoryId,
      summary: `Deleted category '${category.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function moveCategoryAction(
  categoryId: string,
  direction: "up" | "down",
): Promise<FormResult> {
  try {
    const { workspace } = await requireEditAccess();
    const category = await assertCategoryInBudget(categoryId, workspace.budget.id);

    const neighbor = await prisma.category.findFirst({
      where: {
        sectionId: category.sectionId,
        order: direction === "up" ? { lt: category.order } : { gt: category.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return {};

    await prisma.$transaction([
      prisma.category.update({ where: { id: category.id }, data: { order: neighbor.order } }),
      prisma.category.update({ where: { id: neighbor.id }, data: { order: category.order } }),
    ]);
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
