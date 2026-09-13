import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { getAccessibleHouseholds, resolveCurrentWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import ApiTokensPanel from "./ApiTokensPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.apiTokens.metaTitle") };
}

export default async function ApiTokensPage() {
  const user = await requireUser();
  const [households, workspace] = await Promise.all([
    getAccessibleHouseholds(user.id),
    resolveCurrentWorkspace(user.id),
  ]);
  if (!workspace) redirect("/dashboard");

  const budgets = households.flatMap((h) =>
    h.budgets.map((b) => ({ id: b.id, name: b.name, householdName: h.name })),
  );

  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id, revokedAt: null },
    include: { budget: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ApiTokensPanel
      budgets={budgets}
      defaultBudgetId={workspace.budget.id}
      timezone={user.timezone}
      dateFormatPreference={user.dateFormatPreference}
      tokens={tokens.map((tok) => ({
        id: tok.id,
        label: tok.label,
        tokenPreview: tok.tokenPreview,
        budgetName: tok.budget.name,
        createdAt: tok.createdAt.toISOString(),
        lastUsedAt: tok.lastUsedAt ? tok.lastUsedAt.toISOString() : null,
      }))}
    />
  );
}
