import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPagePreference } from "@/lib/pagePreferences";
import HouseholdsPanel from "./HouseholdsPanel";
import { PER_BUDGET_FEATURES } from "./featureLabels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.households.metaTitle") };
}

export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: Promise<{ h?: string }>;
}) {
  const admin = await requireAdmin();
  const t = await getTranslations();
  const { h } = await searchParams;
  const unknownUserName = t("admin.households.unknownUser");

  const [households, users, rowsPerPage] = await Promise.all([
    prisma.household.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { access: true, budgets: true } } },
    }),
    prisma.user.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    getPagePreference(admin.id, "adminHouseholds"),
  ]);

  const selectedId = h ?? households[0]?.id;
  const usersById = new Map(users.map((u) => [u.id, u]));
  const perBudgetFeatures = PER_BUDGET_FEATURES;

  let selected = null;
  if (selectedId) {
    const [access, budgets, budgetAccess, permissions] = await Promise.all([
      prisma.householdAccess.findMany({ where: { householdId: selectedId } }),
      prisma.budget.findMany({ where: { householdId: selectedId }, orderBy: { name: "asc" } }),
      prisma.budgetAccess.findMany({
        where: { budget: { householdId: selectedId } },
      }),
      prisma.featurePermission.findMany({
        where: { budget: { householdId: selectedId } },
      }),
    ]);

    const permKey = (userId: string, budgetId: string) => `${userId}|${budgetId}`;
    const permsByKey = new Map<string, Record<string, string>>();
    for (const p of permissions) {
      const key = permKey(p.userId, p.budgetId);
      const existing = permsByKey.get(key) ?? {};
      existing[p.feature] = p.level;
      permsByKey.set(key, existing);
    }

    selected = {
      id: selectedId,
      members: access.map((a) => ({
        userId: a.userId,
        name: usersById.get(a.userId)?.name ?? unknownUserName,
        role: a.role,
      })),
      budgets: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        access: budgetAccess
          .filter((ba) => ba.budgetId === b.id)
          .map((ba) => ({
            userId: ba.userId,
            name: usersById.get(ba.userId)?.name ?? unknownUserName,
            permissions: Object.fromEntries(
              perBudgetFeatures.map((f) => [
                f,
                permsByKey.get(permKey(ba.userId, b.id))?.[f] ?? "no_access",
              ]),
            ),
          })),
      })),
    };
  }

  return (
    <HouseholdsPanel
      households={households.map((h) => ({
        id: h.id,
        name: h.name,
        memberCount: h._count.access,
        budgetCount: h._count.budgets,
        updatedAt: h.updatedAt.toISOString(),
      }))}
      selectedId={selectedId ?? null}
      selected={selected}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      features={perBudgetFeatures}
      initialRowsPerPage={rowsPerPage}
    />
  );
}
