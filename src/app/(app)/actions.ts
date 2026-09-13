"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { destroySession, setCurrentBudgetId } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guards";
import { getAccessibleHouseholds } from "@/lib/workspace";
import { grantFullBudgetAccess } from "@/lib/permissions";
import { applyDefaultBudgetTemplate } from "@/lib/budgetTemplate";

export interface CreateBudgetResult {
  error?: string;
  budgetId?: string;
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function selectBudgetAction(budgetId: string): Promise<void> {
  const user = await requireUser();
  const households = await getAccessibleHouseholds(user.id);
  const allowed = households.some((h) => h.budgets.some((b) => b.id === budgetId));
  if (!allowed) return;

  await setCurrentBudgetId(budgetId);
  revalidatePath("/", "layout");
}

const budgetNameSchema = z.object({ name: z.string().trim().min(1) });

export async function createBudgetAction(
  householdId: string,
  name: string,
): Promise<CreateBudgetResult> {
  const user = await requireUser();
  const parsed = budgetNameSchema.safeParse({ name });
  if (!parsed.success)
    return { error: "appShell.budgetSwitcher.addBudgetDialog.errors.nameRequired" };

  const households = await getAccessibleHouseholds(user.id);
  const household = households.find((h) => h.id === householdId);
  if (!household?.isOwner) return { error: "common.errors.notAllowed" };

  const budget = await prisma.budget.create({
    data: { householdId, name: parsed.data.name },
  });
  await grantFullBudgetAccess(user.id, budget.id);
  await applyDefaultBudgetTemplate(budget.id);
  await setCurrentBudgetId(budget.id);
  revalidatePath("/", "layout");

  return { budgetId: budget.id };
}
