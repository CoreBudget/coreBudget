import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentBudgetId } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guards";
import { Feature, type PermissionLevel } from "@/generated/prisma/client";
import type { User } from "@/generated/prisma/client";
import { getPlatformFeatureToggles } from "@/lib/platformFeatures";

interface AccessibleBudget {
  id: string;
  name: string;
}

export interface AccessibleHousehold {
  id: string;
  name: string;
  isOwner: boolean;
  budgets: AccessibleBudget[];
}

export async function getAccessibleHouseholds(userId: string): Promise<AccessibleHousehold[]> {
  const access = await prisma.householdAccess.findMany({
    where: { userId },
    include: {
      household: {
        include: {
          budgets: {
            where: { status: "active", budgetAccess: { some: { userId } } },
            orderBy: { name: "asc" },
          },
        },
      },
    },
    orderBy: { household: { name: "asc" } },
  });

  return access.map((a) => ({
    id: a.household.id,
    name: a.household.name,
    isOwner: a.role === "owner",
    budgets: a.household.budgets.map((b) => ({ id: b.id, name: b.name })),
  }));
}

export interface CurrentWorkspace {
  household: AccessibleHousehold;
  budget: AccessibleBudget;
}

export async function resolveCurrentWorkspace(userId: string): Promise<CurrentWorkspace | null> {
  const households = await getAccessibleHouseholds(userId);
  const allBudgets = households.flatMap((h) => h.budgets.map((b) => ({ household: h, budget: b })));
  if (allBudgets.length === 0) return null;

  const cookieBudgetId = await getCurrentBudgetId();
  const match = cookieBudgetId && allBudgets.find((e) => e.budget.id === cookieBudgetId);
  const chosen = match || allBudgets[0];

  return { household: chosen.household, budget: chosen.budget };
}

export async function getFeaturePermissions(
  userId: string,
  budgetId: string,
): Promise<Record<Feature, PermissionLevel>> {
  const [rows, toggles] = await Promise.all([
    prisma.featurePermission.findMany({ where: { userId, budgetId } }),
    getPlatformFeatureToggles(),
  ]);
  const byFeature = new Map(rows.map((r) => [r.feature, r.level]));
  return Object.fromEntries(
    Object.values(Feature).map((feature) => [
      feature,
      toggles[feature] === false ? "no_access" : (byFeature.get(feature) ?? "no_access"),
    ]),
  ) as Record<Feature, PermissionLevel>;
}

export interface FeaturePageContext {
  user: User;
  workspace: CurrentWorkspace;
  level: PermissionLevel;
}

export async function requireFeature(feature: Feature): Promise<FeaturePageContext> {
  const user = await requireUser();
  const workspace = await resolveCurrentWorkspace(user.id);
  if (!workspace) redirect("/dashboard");

  const permissions = await getFeaturePermissions(user.id, workspace.budget.id);
  const level = permissions[feature];
  if (level === "no_access") redirect("/dashboard");

  return { user, workspace, level };
}

export interface AnyFeaturePageContext {
  user: User;
  workspace: CurrentWorkspace;
  levels: Partial<Record<Feature, PermissionLevel>>;
}

export async function requireAnyFeature(features: Feature[]): Promise<AnyFeaturePageContext> {
  const user = await requireUser();
  const workspace = await resolveCurrentWorkspace(user.id);
  if (!workspace) redirect("/dashboard");

  const permissions = await getFeaturePermissions(user.id, workspace.budget.id);
  const levels = Object.fromEntries(features.map((f) => [f, permissions[f]]));
  if (features.every((f) => permissions[f] === "no_access")) redirect("/dashboard");

  return { user, workspace, levels };
}

export interface SidebarAccount {
  id: string;
  name: string;
  balance: string;
  type: string;
}

export interface SidebarAccounts {
  cash: SidebarAccount[];
  credit: SidebarAccount[];
}

export const CREDIT_TYPES = new Set(["credit", "line_credit"]);

export async function getSidebarAccounts(budgetId: string): Promise<SidebarAccounts> {
  const accounts = await prisma.account.findMany({
    where: { budgetId, isClosed: false },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const cash: SidebarAccount[] = [];
  const credit: SidebarAccount[] = [];
  for (const a of accounts) {
    const entry = { id: a.id, name: a.name, balance: a.balance.toString(), type: a.type };
    (CREDIT_TYPES.has(a.type) ? credit : cash).push(entry);
  }
  return { cash, credit };
}

export interface SidebarNetWorthItem {
  id: string;
  name: string;
  type: string;
  value: string;
}

export interface SidebarNetWorth {
  assets: SidebarNetWorthItem[];
  liabilities: SidebarNetWorthItem[];
}

export async function getSidebarNetWorth(budgetId: string): Promise<SidebarNetWorth> {
  const [assets, liabilities] = await Promise.all([
    prisma.asset.findMany({ where: { budgetId }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.liability.findMany({
      where: { budgetId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      value: a.value.toString(),
    })),
    liabilities: liabilities.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      value: l.balance.toString(),
    })),
  };
}
