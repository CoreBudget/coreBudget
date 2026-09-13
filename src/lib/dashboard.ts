import "server-only";
import { prisma } from "@/lib/prisma";
import { CREDIT_TYPES } from "@/lib/workspace";
import { getBudgetMonthData } from "@/lib/budgetRecalc";
import { nextOccurrence } from "@/lib/recurrence";

const MAX_OCCURRENCES_PER_ROW = 60;

const RECONCILIATION_STALE_DAYS = 30;
const CARD_EXPIRING_SOON_DAYS = 30;
const UPCOMING_SCHEDULED_DAYS = 30;
const RECENT_TRANSACTIONS_LIMIT = 10;

interface DashboardSummary {
  netWorth: number;
  totalCash: number;
  totalCredit: number;
  totalAssets: number;
  totalLoans: number;
}

interface DashboardActionItem {
  id: string;
  priority: "high" | "medium" | "low";
  count: number;
  detail: string[];
}

interface DashboardOverspentCategory {
  categoryId: string;
  categoryName: string;
  available: number;
}

interface DashboardCurrentMonthBudget {
  assigned: number;
  activity: number;
  available: number;
  mostOverspent: DashboardOverspentCategory[];
}

interface DashboardLiabilityProgress {
  id: string;
  name: string;
  pctPaid: number;
}

interface DashboardTransaction {
  id: string;
  payeeName: string;
  date: string;
  accountName: string;
  categoryName: string | null;
  amount: number;
  cleared: boolean;
}

interface DashboardUpcoming {
  id: string;
  payeeName: string;
  date: string;
  amount: number;
}

interface DashboardFavoriteCategory {
  id: string;
  name: string;
  hasRow: boolean;
  assigned: number;
  activity: number;
  available: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  actionItems: DashboardActionItem[];
  currentMonthBudget: DashboardCurrentMonthBudget;
  debtPayoff: DashboardLiabilityProgress[];
  recentTransactions: DashboardTransaction[];
  upcomingScheduled: DashboardUpcoming[];
  upcomingNetChange: number;
  favoriteCategories: DashboardFavoriteCategory[];
}

function txnAmount(t: { debit: unknown; credit: unknown }): number {
  return Number(t.credit ?? 0) - Number(t.debit ?? 0);
}

export interface ActionSignals {
  rows: Awaited<ReturnType<typeof getBudgetMonthData>>["rows"];
  uncategorizedCount: number;
  uncategorizedSample: string[];
  pendingCount: number;
  pendingSample: string[];
  overspent: DashboardOverspentCategory[];
  staleAccounts: { id: string; name: string }[];
  expiringWithSubscriptions: { id: string; name: string; subscriptionNames: string[] }[];
}

export async function getActionSignals(
  budgetId: string,
  userId: string,
  month: string,
): Promise<ActionSignals> {
  const now = new Date();
  const staleReconciliation = new Date(now.getTime() - RECONCILIATION_STALE_DAYS * 86400000);
  const cardExpiryWindow = new Date(now.getTime() + CARD_EXPIRING_SOON_DAYS * 86400000);

  const budgetCategories = await prisma.category.findMany({
    where: {
      section: { budgetId, isIncome: false, isCreditCardPayment: false },
      isActive: true,
      hideFromBudget: false,
    },
    select: { id: true, name: true },
  });
  const categoryIds = budgetCategories.map((c) => c.id);
  const categoryNameById = new Map(budgetCategories.map((c) => [c.id, c.name]));

  const uncategorizedWhere = {
    account: { budgetId },
    categoryId: null,
    isSplit: false,
    pendingApproval: false,
    isScheduled: { not: true },
  } as const;
  const pendingWhere = { account: { budgetId }, pendingApproval: true } as const;

  const [
    { rows },
    uncategorizedCount,
    uncategorizedSample,
    pendingCount,
    pendingSample,
    accounts,
    expiringAccounts,
  ] = await Promise.all([
    getBudgetMonthData(budgetId, month, categoryIds),
    prisma.transaction.count({ where: uncategorizedWhere }),
    prisma.transaction.findMany({
      where: uncategorizedWhere,
      orderBy: [{ postDate: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { payee: true },
    }),
    prisma.transaction.count({ where: pendingWhere }),
    prisma.transaction.findMany({
      where: pendingWhere,
      orderBy: [{ postDate: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { payee: true },
    }),
    prisma.account.findMany({ where: { budgetId, isClosed: false } }),
    prisma.account.findMany({
      where: {
        budgetId,
        isClosed: false,
        cardExpirationDate: { gte: now, lte: cardExpiryWindow },
      },
      include: { subscriptions: { select: { name: true } } },
    }),
  ]);

  const staleAccounts = accounts.filter(
    (a) => !a.reconciledDate || a.reconciledDate < staleReconciliation,
  );

  const overspent: DashboardOverspentCategory[] = [];
  for (const [categoryId, row] of rows) {
    if (row.assigned + row.carryover - row.activity < 0) {
      overspent.push({
        categoryId,
        categoryName: categoryNameById.get(categoryId) ?? "",
        available: row.available,
      });
    }
  }
  overspent.sort((a, b) => a.available - b.available);

  function txnSummary(t: {
    payee: { name: string };
    postDate: Date;
    debit: unknown;
    credit: unknown;
  }): string {
    const amount = txnAmount(t);
    const datePart = t.postDate.toISOString().slice(0, 10);
    return `${t.payee.name} · ${datePart} · ${amount < 0 ? "-" : ""}${Math.abs(amount).toFixed(2)}`;
  }

  const expiringWithSubscriptions = expiringAccounts
    .filter((a) => a.subscriptions.length > 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      subscriptionNames: a.subscriptions.map((s) => s.name),
    }));

  return {
    rows,
    uncategorizedCount,
    uncategorizedSample: uncategorizedSample.map(txnSummary),
    pendingCount,
    pendingSample: pendingSample.map(txnSummary),
    overspent,
    staleAccounts: staleAccounts.map((a) => ({ id: a.id, name: a.name })),
    expiringWithSubscriptions,
  };
}

export interface NetWorthSummary {
  netWorth: number;
  totalCash: number;
  totalCredit: number;
  totalAssets: number;
  totalLoans: number;
}

export async function getNetWorthSummary(budgetId: string): Promise<NetWorthSummary> {
  const [accounts, assets, liabilities] = await Promise.all([
    prisma.account.findMany({ where: { budgetId, isClosed: false } }),
    prisma.asset.findMany({ where: { budgetId } }),
    prisma.liability.findMany({ where: { budgetId } }),
  ]);

  const totalCash = accounts
    .filter((a) => !CREDIT_TYPES.has(a.type))
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const totalCredit = accounts
    .filter((a) => CREDIT_TYPES.has(a.type))
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const totalAssets = assets.reduce((sum, a) => sum + Number(a.value), 0);
  const totalLoans = liabilities.reduce((sum, l) => sum + Number(l.balance), 0);
  const netWorth = totalCash + totalAssets + totalCredit - totalLoans;

  return { netWorth, totalCash, totalCredit, totalAssets, totalLoans };
}

export async function getDashboardData(
  budgetId: string,
  userId: string,
  month: string,
): Promise<DashboardData> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const upcomingWindow = new Date(today.getTime() + UPCOMING_SCHEDULED_DAYS * 86400000);

  const [
    netWorthSummary,
    liabilities,
    favorites,
    budgetCategories,
    signals,
    recentTxns,
    upcomingRepeating,
  ] = await Promise.all([
    getNetWorthSummary(budgetId),
    prisma.liability.findMany({
      where: { budgetId },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.favoriteCategory.findMany({
      where: { userId, category: { section: { budgetId } } },
      select: { categoryId: true },
    }),
    prisma.category.findMany({
      where: {
        section: { budgetId, isIncome: false, isCreditCardPayment: false },
        isActive: true,
        hideFromBudget: false,
      },
      select: { id: true, name: true },
    }),
    getActionSignals(budgetId, userId, month),
    prisma.transaction.findMany({
      where: {
        account: { budgetId },
        pendingApproval: false,
        isScheduled: { not: true },
      },
      orderBy: [{ postDate: "desc" }, { createdAt: "desc" }],
      take: RECENT_TRANSACTIONS_LIMIT,
      include: {
        payee: true,
        category: { select: { name: true } },
        account: { select: { name: true } },
      },
    }),
    prisma.repeatingTransaction.findMany({
      where: {
        account: { budgetId },
        isActive: true,
        nextOccurrenceDate: { lte: upcomingWindow },
      },
      include: { payee: true },
    }),
  ]);

  const {
    rows,
    uncategorizedCount,
    uncategorizedSample,
    pendingCount,
    pendingSample,
    overspent,
    staleAccounts,
    expiringWithSubscriptions,
  } = signals;

  let totalAssigned = 0;
  let totalActivity = 0;
  let totalAvailable = 0;
  for (const row of rows.values()) {
    totalAssigned += row.assigned;
    totalActivity += row.activity;
    totalAvailable += row.available;
  }

  const actionItems: DashboardActionItem[] = [];
  if (uncategorizedCount > 0) {
    actionItems.push({
      id: "uncategorized",
      priority: uncategorizedCount >= 5 ? "high" : "medium",
      count: uncategorizedCount,
      detail: uncategorizedSample,
    });
  }
  if (pendingCount > 0) {
    actionItems.push({
      id: "needsReview",
      priority: pendingCount >= 5 ? "high" : "medium",
      count: pendingCount,
      detail: pendingSample,
    });
  }
  if (overspent.length > 0) {
    actionItems.push({
      id: "overBudget",
      priority: "high",
      count: overspent.length,
      detail: overspent.map((o) => o.categoryName),
    });
  }
  if (staleAccounts.length > 0) {
    actionItems.push({
      id: "reconciliation",
      priority: "medium",
      count: staleAccounts.length,
      detail: staleAccounts.map((a) => a.name),
    });
  }
  if (expiringWithSubscriptions.length > 0) {
    actionItems.push({
      id: "cardExpiring",
      priority: "high",
      count: expiringWithSubscriptions.length,
      detail: expiringWithSubscriptions.flatMap((a) => a.subscriptionNames),
    });
  }

  const recentTransactions: DashboardTransaction[] = recentTxns.map((t) => ({
    id: t.id,
    payeeName: t.payee.name,
    date: t.postDate.toISOString(),
    accountName: t.account.name,
    categoryName: t.category?.name ?? null,
    amount: txnAmount(t),
    cleared: t.cleared,
  }));

  const upcomingScheduled: DashboardUpcoming[] = [];
  for (const rt of upcomingRepeating) {
    let occurrenceDate = rt.nextOccurrenceDate;
    let iterations = 0;
    while (occurrenceDate <= upcomingWindow && iterations < MAX_OCCURRENCES_PER_ROW) {
      if (occurrenceDate >= today) {
        upcomingScheduled.push({
          id: `${rt.id}-${occurrenceDate.toISOString()}`,
          payeeName: rt.payee.name,
          date: occurrenceDate.toISOString(),
          amount: txnAmount(rt),
        });
      }
      occurrenceDate = nextOccurrence(occurrenceDate, rt.repeatType, rt.intervalWeeks);
      iterations += 1;
    }
  }
  upcomingScheduled.sort((a, b) => (a.date < b.date ? -1 : 1));
  const upcomingNetChange = upcomingScheduled.reduce((sum, u) => sum + u.amount, 0);

  const favoriteCategoryIds = new Set(favorites.map((f) => f.categoryId));
  const favoriteCategories: DashboardFavoriteCategory[] = budgetCategories
    .filter((c) => favoriteCategoryIds.has(c.id))
    .map((c) => {
      const row = rows.get(c.id);
      return {
        id: c.id,
        name: c.name,
        hasRow: row?.hasRow ?? false,
        assigned: row?.assigned ?? 0,
        activity: row?.activity ?? 0,
        available: row?.available ?? 0,
      };
    });

  return {
    summary: netWorthSummary,
    actionItems,
    currentMonthBudget: {
      assigned: totalAssigned,
      activity: totalActivity,
      available: totalAvailable,
      mostOverspent: overspent.slice(0, 3),
    },
    debtPayoff: liabilities.slice(0, 3).map((l) => ({
      id: l.id,
      name: l.name,
      pctPaid:
        Number(l.startingBalance) > 0
          ? Math.round(
              ((Number(l.startingBalance) - Number(l.balance)) / Number(l.startingBalance)) * 100,
            )
          : 0,
    })),
    recentTransactions,
    upcomingScheduled,
    upcomingNetChange,
    favoriteCategories,
  };
}
