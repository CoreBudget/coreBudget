import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { shiftYearMonth } from "@/lib/month";

interface CategoryAssignmentRow {
  categoryId: string;
  assigned: number;
  activity: number;
  carryover: number;
  available: number;
  hasRow: boolean;
}

interface CategoryActivityDetail {
  transactionId: string;
  date: string;
  payeeName: string;
  accountName: string;
  amount: number;
}

export interface BudgetMonthData {
  rows: Map<string, CategoryAssignmentRow>;
  activityDetails: Map<string, CategoryActivityDetail[]>;
  readyToAssign: number;
}

function monthDateRange(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 1)),
  };
}

async function fetchActivityDetails(
  categoryIds: string[],
  start: Date,
  end: Date,
): Promise<Map<string, CategoryActivityDetail[]>> {
  const [transactions, splits] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        categoryId: { in: categoryIds },
        isSplit: false,
        pendingApproval: false,
        postDate: { gte: start, lt: end },
      },
      include: { payee: true, account: { select: { name: true } } },
    }),
    prisma.transactionSplit.findMany({
      where: {
        categoryId: { in: categoryIds },
        transaction: { pendingApproval: false, postDate: { gte: start, lt: end } },
      },
      include: { transaction: { include: { payee: true, account: { select: { name: true } } } } },
    }),
  ]);

  const byCategory = new Map<string, CategoryActivityDetail[]>();
  function push(categoryId: string, detail: CategoryActivityDetail) {
    const list = byCategory.get(categoryId) ?? [];
    list.push(detail);
    byCategory.set(categoryId, list);
  }

  for (const t of transactions) {
    if (!t.categoryId) continue;
    push(t.categoryId, {
      transactionId: t.id,
      date: t.postDate.toISOString(),
      payeeName: t.payee.name,
      accountName: t.account.name,
      amount: Number(t.credit ?? 0) - Number(t.debit ?? 0),
    });
  }
  for (const s of splits) {
    push(s.categoryId, {
      transactionId: s.transactionId,
      date: s.transaction.postDate.toISOString(),
      payeeName: s.transaction.payee.name,
      accountName: s.transaction.account.name,
      amount: Number(s.credit ?? 0) - Number(s.debit ?? 0),
    });
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  return byCategory;
}

function activityTotal(details: CategoryActivityDetail[] | undefined): number {
  return (details ?? []).reduce((sum, d) => sum + d.amount, 0);
}

export async function computeCategoryActivity(categoryId: string, month: string): Promise<number> {
  const { start, end } = monthDateRange(month);
  const details = await fetchActivityDetails([categoryId], start, end);
  return activityTotal(details.get(categoryId));
}

async function computeIncomeActivity(budgetId: string, month: string): Promise<number> {
  const incomeCategories = await prisma.category.findMany({
    where: { section: { budgetId, isIncome: true }, isActive: true },
    select: { id: true },
  });
  if (incomeCategories.length === 0) return 0;
  const { start, end } = monthDateRange(month);
  const details = await fetchActivityDetails(
    incomeCategories.map((c) => c.id),
    start,
    end,
  );
  let total = 0;
  for (const list of details.values()) total += activityTotal(list);
  return total;
}

async function priorReadyToAssign(budgetId: string, month: string): Promise<number> {
  const priorMonth = shiftYearMonth(month, -1);
  const prior = await prisma.budgetReadyToAssign.findUnique({
    where: { budgetId_month: { budgetId, month: priorMonth } },
  });
  return prior ? Number(prior.amount) : 0;
}

export async function getBudgetMonthData(
  budgetId: string,
  month: string,
  categoryIds: string[],
): Promise<BudgetMonthData> {
  const { start, end } = monthDateRange(month);
  const activityDetails = await fetchActivityDetails(categoryIds, start, end);

  const lockResult = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(hashtext(${budgetId}), hashtext(${month})) AS locked
  `;
  const acquired = lockResult[0]?.locked === true;

  try {
    const [existingRows, existingRTA] = await Promise.all([
      categoryIds.length > 0
        ? prisma.categoryAssignment.findMany({ where: { categoryId: { in: categoryIds }, month } })
        : Promise.resolve([]),
      prisma.budgetReadyToAssign.findUnique({ where: { budgetId_month: { budgetId, month } } }),
    ]);
    const existingByCategory = new Map(existingRows.map((r) => [r.categoryId, r]));

    if (!acquired) {
      const rows = new Map<string, CategoryAssignmentRow>();
      for (const categoryId of categoryIds) {
        const row = existingByCategory.get(categoryId);
        rows.set(categoryId, {
          categoryId,
          assigned: row ? Number(row.assigned) : 0,
          activity: row ? Number(row.activity) : 0,
          carryover: row ? Number(row.carryover) : 0,
          available: row ? Number(row.available) : 0,
          hasRow: !!row,
        });
      }
      return { rows, activityDetails, readyToAssign: existingRTA ? Number(existingRTA.amount) : 0 };
    }

    const priorMonth = shiftYearMonth(month, -1);
    const priorRows =
      categoryIds.length > 0
        ? await prisma.categoryAssignment.findMany({
            where: { categoryId: { in: categoryIds }, month: priorMonth },
          })
        : [];
    const priorAvailableByCategory = new Map(
      priorRows.map((r) => [r.categoryId, Number(r.available)]),
    );

    const rows = new Map<string, CategoryAssignmentRow>();
    const updates: { id: string; activity: number; carryover: number; available: number }[] = [];
    let totalAssigned = 0;

    for (const categoryId of categoryIds) {
      const existing = existingByCategory.get(categoryId);
      const assigned = existing ? Number(existing.assigned) : 0;
      const carryover = priorAvailableByCategory.get(categoryId) ?? 0;
      const activity = activityTotal(activityDetails.get(categoryId));
      const available = assigned + carryover + activity;
      totalAssigned += assigned;

      rows.set(categoryId, {
        categoryId,
        assigned,
        activity,
        carryover,
        available,
        hasRow: !!existing,
      });

      if (
        existing &&
        (Number(existing.activity) !== activity ||
          Number(existing.carryover) !== carryover ||
          Number(existing.available) !== available)
      ) {
        updates.push({ id: existing.id, activity, carryover, available });
      }
    }

    const [incomeActivity, priorRTA] = await Promise.all([
      computeIncomeActivity(budgetId, month),
      priorReadyToAssign(budgetId, month),
    ]);
    const readyToAssign = priorRTA + incomeActivity - totalAssigned;

    const writes: Prisma.PrismaPromise<unknown>[] = updates.map((u) =>
      prisma.categoryAssignment.update({
        where: { id: u.id },
        data: { activity: u.activity, carryover: u.carryover, available: u.available },
      }),
    );
    if (!existingRTA || Number(existingRTA.amount) !== readyToAssign) {
      writes.push(
        prisma.budgetReadyToAssign.upsert({
          where: { budgetId_month: { budgetId, month } },
          create: { budgetId, month, amount: readyToAssign },
          update: { amount: readyToAssign },
        }),
      );
    }
    if (writes.length > 0) {
      await prisma.$transaction(writes);
    }

    return { rows, activityDetails, readyToAssign };
  } finally {
    if (acquired) {
      await prisma.$executeRaw`SELECT pg_advisory_unlock(hashtext(${budgetId}), hashtext(${month}))`;
    }
  }
}

export interface BudgetCategoryStatusRow {
  id: string;
  name: string;
  sectionName: string;
  assigned: number;
  activity: number;
  available: number;
}

export async function getBudgetCategoryStatus(
  budgetId: string,
  month: string,
): Promise<BudgetCategoryStatusRow[]> {
  const categories = await prisma.category.findMany({
    where: {
      section: { budgetId, isIncome: false, isCreditCardPayment: false },
      isActive: true,
      hideFromBudget: false,
    },
    select: { id: true, name: true, section: { select: { name: true } } },
  });

  const { rows } = await getBudgetMonthData(
    budgetId,
    month,
    categories.map((c) => c.id),
  );

  return categories.map((c) => {
    const row = rows.get(c.id);
    return {
      id: c.id,
      name: c.name,
      sectionName: c.section.name,
      assigned: row?.assigned ?? 0,
      activity: row?.activity ?? 0,
      available: row?.available ?? 0,
    };
  });
}
