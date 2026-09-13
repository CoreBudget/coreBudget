import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { getSidebarAccounts, requireFeature } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import SubscriptionsPanel from "./SubscriptionsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("subscriptions.metaTitle") };
}

export default async function SubscriptionsPage() {
  const { user, workspace, level } = await requireFeature(Feature.subscriptions);
  const settings = await getPlatformSettings();

  const [subscriptions, sidebarAccounts, sections, payees] = await Promise.all([
    prisma.subscription.findMany({
      where: { budgetId: workspace.budget.id },
      orderBy: { renewalDate: "asc" },
      include: {
        account: true,
        category: true,
        repeatingTransaction: { include: { payee: true } },
      },
    }),
    getSidebarAccounts(workspace.budget.id),
    prisma.section.findMany({
      where: { budgetId: workspace.budget.id, isActive: true, isCreditCardPayment: false },
      orderBy: { order: "asc" },
      include: {
        categories: {
          where: { isActive: true, hideFromBudget: false },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.payee.findMany({
      where: { includeInList: true },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  return (
    <SubscriptionsPanel
      canEdit={level === "edit"}
      locale={user.locale}
      currencyCode={settings.currencyCode}
      accounts={[
        ...sidebarAccounts.cash.map((a) => ({ id: a.id, name: a.name, group: "cash" as const })),
        ...sidebarAccounts.credit.map((a) => ({
          id: a.id,
          name: a.name,
          group: "credit" as const,
        })),
      ]}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        categories: s.categories.map((c) => ({ id: c.id, name: c.name })),
      }))}
      payees={payees.map((p) => p.name)}
      subscriptions={subscriptions.map((s) => ({
        id: s.id,
        name: s.name,
        payeeName: s.repeatingTransaction.payee.name,
        website: s.website,
        cadence: s.cadence,
        intervalWeeks: s.intervalWeeks,
        amount: s.amount.toString(),
        renewalDate: s.renewalDate.toISOString(),
        autoRenew: s.autoRenew,
        accountId: s.accountId,
        accountName: s.account.name,
        accountCardExpirationDate: s.account.cardExpirationDate?.toISOString() ?? null,
        categoryId: s.categoryId,
        categoryName: s.category?.name ?? null,
        status: s.status,
        trialEndDate: s.trialEndDate?.toISOString() ?? null,
        notes: s.notes,
      }))}
    />
  );
}
