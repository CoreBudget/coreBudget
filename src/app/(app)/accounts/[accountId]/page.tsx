import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSidebarAccounts, requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import TransactionsView from "./TransactionsView";
import { isDatePreset, isSortColumn, isSortDirection, parseViewPreference } from "./viewPreference";

function formatCardExpiration(date: Date | null): string | null {
  if (!date) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${month}/${date.getUTCFullYear()}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("accounts.metaTitle") };
}

export default async function AccountPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { user, workspace, level } = await requireFeature(Feature.transactions);
  const { accountId } = await params;

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.budgetId !== workspace.budget.id) notFound();

  const [
    sections,
    payees,
    transactions,
    upcomingRepeatingTransactions,
    settings,
    savedViewPreference,
    sidebarAccounts,
  ] = await Promise.all([
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
    prisma.transaction.findMany({
      where: { accountId },
      orderBy: [{ postDate: "desc" }, { createdAt: "desc" }],
      include: { payee: true, category: true, splits: { include: { category: true } } },
    }),
    prisma.repeatingTransaction.findMany({
      where: { accountId, isActive: true },
      orderBy: { nextOccurrenceDate: "asc" },
      include: { payee: true, category: true, splits: true },
    }),
    getPlatformSettings(),
    prisma.transactionViewPreference.findUnique({
      where: { userId_accountId: { userId: user.id, accountId } },
    }),
    getSidebarAccounts(workspace.budget.id),
  ]);
  const viewPreference = parseViewPreference(savedViewPreference?.filters, {
    sortColumn: isSortColumn(user.defaultLedgerSortColumn)
      ? user.defaultLedgerSortColumn
      : undefined,
    sortDirection: isSortDirection(user.defaultLedgerSortDirection)
      ? user.defaultLedgerSortDirection
      : undefined,
    datePreset: isDatePreset(user.defaultLedgerDatePreset)
      ? user.defaultLedgerDatePreset
      : undefined,
  });

  return (
    <TransactionsView
      accountId={account.id}
      accountName={account.name}
      accountType={account.type}
      accountWebsite={account.website}
      accountPaymentDueDay={account.paymentDueDay}
      accountCardExpiration={formatCardExpiration(account.cardExpirationDate)}
      clearedBalance={account.clearedBalance.toString()}
      unclearedBalance={account.unclearedBalance.toString()}
      balance={account.balance.toString()}
      initialViewPreference={viewPreference}
      canEdit={level === "edit"}
      currencyCode={settings.currencyCode}
      locale={user.locale}
      reconciledDate={account.reconciledDate?.toISOString() ?? null}
      cashAccounts={sidebarAccounts.cash.map((a) => ({ id: a.id, name: a.name }))}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        categories: s.categories.map((c) => ({ id: c.id, name: c.name })),
      }))}
      payees={payees.map((p) => p.name)}
      transactions={transactions.map((t) => ({
        id: t.id,
        postDate: t.postDate.toISOString(),
        payeeName: t.payee.name,
        categoryId: t.categoryId,
        categoryName: t.category?.name ?? null,
        memo: t.memo,
        debit: t.debit?.toString() ?? null,
        credit: t.credit?.toString() ?? null,
        runningBalance: t.runningBalance.toString(),
        cleared: t.cleared,
        reconciled: t.reconciled,
        pendingApproval: t.pendingApproval,
        isScheduled: t.isScheduled ?? false,
        repeatingTransactionId: t.repeatingTransactionId,
        isSplit: t.isSplit,
        splitsCollapsed: t.splitsCollapsed,
        splits: t.splits.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          categoryName: s.category.name,
          memo: s.memo,
          debit: s.debit?.toString() ?? null,
          credit: s.credit?.toString() ?? null,
        })),
      }))}
      upcomingRepeatingTransactions={upcomingRepeatingTransactions.map((rt) => ({
        id: rt.id,
        payeeName: rt.payee.name,
        categoryName: rt.category?.name ?? null,
        isSplit: rt.splits.length > 0,
        debit: rt.debit?.toString() ?? null,
        credit: rt.credit?.toString() ?? null,
        repeatType: rt.repeatType,
        intervalWeeks: rt.intervalWeeks,
        nextOccurrenceDate: rt.nextOccurrenceDate.toISOString(),
      }))}
    />
  );
}
