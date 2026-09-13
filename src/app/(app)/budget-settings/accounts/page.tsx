import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { CREDIT_TYPES, requireFeature } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import AccountsPanel from "./AccountsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("budgetSettings.accounts.metaTitle") };
}

function formatCardExpiration(date: Date | null): string | null {
  if (!date) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${month}/${date.getUTCFullYear()}`;
}

export default async function AccountsSettingsPage() {
  const { workspace, level } = await requireFeature(Feature.budget_settings);

  const [accounts, assets, liabilities] = await Promise.all([
    prisma.account.findMany({
      where: { budgetId: workspace.budget.id, isClosed: false },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.asset.findMany({
      where: { budgetId: workspace.budget.id },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.liability.findMany({
      where: { budgetId: workspace.budget.id },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  const cashAccounts = accounts.filter((a) => !CREDIT_TYPES.has(a.type));
  const creditAccounts = accounts.filter((a) => CREDIT_TYPES.has(a.type));

  return (
    <AccountsPanel
      canEdit={level === "edit"}
      cashAccounts={cashAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        website: a.website,
      }))}
      creditAccounts={creditAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        website: a.website,
        paymentDueDay: a.paymentDueDay,
        cardExpiration: formatCardExpiration(a.cardExpirationDate),
      }))}
      assets={assets.map((a) => ({ id: a.id, name: a.name }))}
      liabilities={liabilities.map((l) => ({ id: l.id, name: l.name }))}
    />
  );
}
