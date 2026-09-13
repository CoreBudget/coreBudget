import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { getSidebarAccounts, requireFeature } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import RepeatingTransactionsPanel from "./RepeatingTransactionsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("budgetSettings.repeating.metaTitle") };
}

export default async function RepeatingTransactionsSettingsPage() {
  const { user, workspace, level } = await requireFeature(Feature.repeating_transactions);
  const settings = await getPlatformSettings();

  const [repeatingTransactions, sidebarAccounts, sections, payees] = await Promise.all([
    prisma.repeatingTransaction.findMany({
      where: { account: { budgetId: workspace.budget.id } },
      orderBy: { nextOccurrenceDate: "asc" },
      include: {
        account: true,
        payee: true,
        category: true,
        subscription: true,
        _count: { select: { generatedTransactions: true } },
        splits: { include: { category: true } },
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
      select: { id: true, name: true },
    }),
  ]);

  return (
    <RepeatingTransactionsPanel
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
      repeatingTransactions={repeatingTransactions.map((rt) => ({
        id: rt.id,
        accountId: rt.accountId,
        accountName: rt.account.name,
        payeeName: rt.payee.name,
        categoryId: rt.categoryId,
        categoryName: rt.category?.name ?? null,
        memo: rt.memo,
        debit: rt.debit?.toString() ?? null,
        credit: rt.credit?.toString() ?? null,
        repeatType: rt.repeatType,
        intervalWeeks: rt.intervalWeeks,
        nextOccurrenceDate: rt.nextOccurrenceDate.toISOString(),
        isActive: rt.isActive,
        hasHistory: rt._count.generatedTransactions > 0,
        isSubscriptionLinked: !!rt.subscription,
        isSplit: rt.splits.length > 0,
        splits: rt.splits.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          categoryName: s.category.name,
          memo: s.memo,
          debit: s.debit?.toString() ?? null,
          credit: s.credit?.toString() ?? null,
        })),
      }))}
    />
  );
}
