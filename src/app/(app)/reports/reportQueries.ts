import "server-only";
import { prisma } from "@/lib/prisma";
import {
  monthlyTargetAmount,
  remainingMonthlyTargetAmount,
  type CategoryTargetFields,
} from "@/lib/categoryTarget";
import { computePayoffProjection, percentPaidOff } from "@/lib/liabilityPayoff";
import { currentYearMonth } from "@/lib/month";
import type { EmployerContributionItem, IncomeItem, WithholdingItem } from "@/lib/paycheckCalc";

function yearRange(year: number) {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) };
}

export function reportYearOptions(selectedYear: number): number[] {
  const currentYear = new Date().getUTCFullYear();
  const years = new Set<number>([selectedYear]);
  for (let y = currentYear; y > currentYear - 5; y--) years.add(y);
  return Array.from(years).sort((a, b) => b - a);
}

export interface ReportCategoryMonthlyRow {
  id: string;
  name: string;
  sectionName: string;
  monthly: number[];
  total: number;
}

export interface IncomeExpenseReportData {
  income: ReportCategoryMonthlyRow[];
  expense: ReportCategoryMonthlyRow[];
}

export async function getIncomeExpenseReport(
  budgetId: string,
  year: number,
): Promise<IncomeExpenseReportData> {
  const categories = await prisma.category.findMany({
    where: {
      section: { budgetId, isSavings: false, isCreditCardPayment: false },
      isActive: true,
      hideFromBudget: false,
    },
    include: { section: true },
    orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
  });
  const categoryIds = categories.map((c) => c.id);
  const { start, end } = yearRange(year);

  const monthlyByCategory = new Map<string, number[]>();
  function add(categoryId: string, month: number, amount: number) {
    const arr = monthlyByCategory.get(categoryId) ?? Array(12).fill(0);
    arr[month] += amount;
    monthlyByCategory.set(categoryId, arr);
  }

  if (categoryIds.length > 0) {
    const [transactions, splits] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          categoryId: { in: categoryIds },
          isSplit: false,
          pendingApproval: false,
          postDate: { gte: start, lt: end },
        },
        select: { categoryId: true, postDate: true, debit: true, credit: true },
      }),
      prisma.transactionSplit.findMany({
        where: {
          categoryId: { in: categoryIds },
          transaction: { pendingApproval: false, postDate: { gte: start, lt: end } },
        },
        select: {
          categoryId: true,
          debit: true,
          credit: true,
          transaction: { select: { postDate: true } },
        },
      }),
    ]);
    for (const t of transactions) {
      if (!t.categoryId) continue;
      add(t.categoryId, t.postDate.getUTCMonth(), Number(t.credit ?? 0) - Number(t.debit ?? 0));
    }
    for (const s of splits) {
      add(
        s.categoryId,
        s.transaction.postDate.getUTCMonth(),
        Number(s.credit ?? 0) - Number(s.debit ?? 0),
      );
    }
  }

  const income: ReportCategoryMonthlyRow[] = [];
  const expense: ReportCategoryMonthlyRow[] = [];
  for (const c of categories) {
    const monthly = monthlyByCategory.get(c.id) ?? Array(12).fill(0);
    const row: ReportCategoryMonthlyRow = {
      id: c.id,
      name: c.name,
      sectionName: c.section.name,
      monthly,
      total: monthly.reduce((a, b) => a + b, 0),
    };
    (c.section.isIncome ? income : expense).push(row);
  }

  return { income, expense };
}

interface PaycheckReportJobBreakdown {
  jobId: string;
  jobName: string;
  personName: string;
  gross: number;
  net: number;
}

interface PaycheckReportMonth {
  month: number;
  gross: number;
  net: number;
  jobs: PaycheckReportJobBreakdown[];
}

export interface PaycheckReportData {
  ytd: {
    gross: number;
    federalTax: number;
    oasdi: number;
    medicare: number;
    stateTax: number;
    employee401k: number;
    employer401k: number;
    employerContributions: number;
    net: number;
  };
  months: PaycheckReportMonth[];
}

export async function getPaychecksReport(
  budgetId: string,
  year: number,
): Promise<PaycheckReportData> {
  const access = await prisma.budgetAccess.findMany({
    where: { budgetId },
    select: { userId: true },
  });
  const userIds = access.map((a) => a.userId);
  const { start, end } = yearRange(year);

  const paychecks = userIds.length
    ? await prisma.paycheck.findMany({
        where: { job: { userId: { in: userIds } }, periodStartDate: { gte: start, lt: end } },
        include: { job: { include: { user: { select: { name: true } } } } },
        orderBy: { periodStartDate: "asc" },
      })
    : [];

  const ytd = {
    gross: 0,
    federalTax: 0,
    oasdi: 0,
    medicare: 0,
    stateTax: 0,
    employee401k: 0,
    employer401k: 0,
    employerContributions: 0,
    net: 0,
  };
  const monthMap = new Map<number, PaycheckReportMonth>();

  for (const p of paychecks) {
    const incomeItems = p.incomeItems as unknown as IncomeItem[];
    const withholdingItems = p.withholdingItems as unknown as WithholdingItem[];
    const employerItems = p.employerContributionItems as unknown as EmployerContributionItem[];

    const gross = Number(p.grossIncome) + incomeItems.reduce((s, i) => s + i.amount, 0);
    const withholdings = withholdingItems.reduce((s, w) => s + w.amount, 0);
    const employee401k = withholdingItems
      .filter((w) => w.calculationType === "401k")
      .reduce((s, w) => s + w.amount, 0);
    const employer401k = employerItems
      .filter((e) => e.calculationType === "401k_match")
      .reduce((s, e) => s + e.amount, 0);
    const employerContributions = employerItems.reduce((s, e) => s + e.amount, 0);
    const federalTax = Number(p.federalTaxAmount);
    const oasdi = Number(p.oasdiAmount);
    const medicare = Number(p.medicareAmount);
    const stateTax = Number(p.stateTaxAmount);
    const net = gross - withholdings - federalTax - oasdi - medicare - stateTax;

    ytd.gross += gross;
    ytd.federalTax += federalTax;
    ytd.oasdi += oasdi;
    ytd.medicare += medicare;
    ytd.stateTax += stateTax;
    ytd.employee401k += employee401k;
    ytd.employer401k += employer401k;
    ytd.employerContributions += employerContributions;
    ytd.net += net;

    const month = p.periodStartDate.getUTCMonth();
    const entry = monthMap.get(month) ?? { month, gross: 0, net: 0, jobs: [] };
    entry.gross += gross;
    entry.net += net;
    const jobRow = entry.jobs.find((j) => j.jobId === p.jobId);
    if (jobRow) {
      jobRow.gross += gross;
      jobRow.net += net;
    } else {
      entry.jobs.push({
        jobId: p.jobId,
        jobName: p.job.name,
        personName: p.job.user.name,
        gross,
        net,
      });
    }
    monthMap.set(month, entry);
  }

  return { ytd, months: Array.from(monthMap.values()).sort((a, b) => b.month - a.month) };
}

export interface NetWorthReportData {
  months: { month: number; netWorth: number }[];
  changeAmount: number;
}

export async function getNetWorthReport(
  budgetId: string,
  year: number,
): Promise<NetWorthReportData> {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const lastMonthIndex = year < currentYear ? 11 : year === currentYear ? now.getUTCMonth() : -1;
  if (lastMonthIndex < 0) return { months: [], changeAmount: 0 };

  const [accounts, assets, liabilities] = await Promise.all([
    prisma.account.findMany({ where: { budgetId }, select: { id: true, balance: true } }),
    prisma.asset.findMany({ where: { budgetId }, select: { id: true, value: true } }),
    prisma.liability.findMany({ where: { budgetId }, select: { id: true, balance: true } }),
  ]);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const accountIds = accounts.map((a) => a.id);
  const assetIds = assets.map((a) => a.id);
  const liabilityIds = liabilities.map((l) => l.id);

  const [laterTxns, assetChanges, liabilityChanges] = await Promise.all([
    accountIds.length
      ? prisma.transaction.findMany({
          where: {
            accountId: { in: accountIds },
            postDate: { gte: yearStart },
            pendingApproval: false,
          },
          select: { accountId: true, postDate: true, debit: true, credit: true },
        })
      : Promise.resolve([]),
    assetIds.length
      ? prisma.assetValueChange.findMany({
          where: { assetId: { in: assetIds } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    liabilityIds.length
      ? prisma.liabilityBalanceChange.findMany({
          where: { liabilityId: { in: liabilityIds } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const months: { month: number; netWorth: number }[] = [];
  for (let m = 0; m <= lastMonthIndex; m++) {
    const asOf = new Date(Date.UTC(year, m + 1, 1));

    let accountTotal = 0;
    for (const a of accounts) {
      const reversal = laterTxns
        .filter((t) => t.accountId === a.id && t.postDate >= asOf)
        .reduce((sum, t) => sum + (Number(t.credit ?? 0) - Number(t.debit ?? 0)), 0);
      accountTotal += Number(a.balance) - reversal;
    }

    let assetTotal = 0;
    for (const asset of assets) {
      const before = assetChanges.filter((c) => c.assetId === asset.id && c.date < asOf);
      const latest = before[before.length - 1];
      assetTotal += latest ? Number(latest.value) : Number(asset.value);
    }

    let liabilityTotal = 0;
    for (const liability of liabilities) {
      const before = liabilityChanges.filter(
        (c) => c.liabilityId === liability.id && c.date < asOf,
      );
      const latest = before[before.length - 1];
      liabilityTotal += latest ? Number(latest.balance) : Number(liability.balance);
    }

    months.push({ month: m, netWorth: accountTotal + assetTotal - liabilityTotal });
  }

  const changeAmount =
    months.length >= 2 ? months[months.length - 1].netWorth - months[0].netWorth : 0;
  return { months, changeAmount };
}

interface BudgetVsActualMonthRow {
  month: number;
  planned: number;
  actual: number;
}

interface BudgetVsActualSectionRow {
  sectionId: string;
  sectionName: string;
  planned: number;
  actual: number;
}

export interface BudgetVsActualData {
  months: BudgetVsActualMonthRow[];
  sectionBreakdown: BudgetVsActualSectionRow[];
  latestMonth: string | null;
}

export async function getBudgetVsActualReport(
  budgetId: string,
  year: number,
): Promise<BudgetVsActualData> {
  const categories = await prisma.category.findMany({
    where: { section: { budgetId }, isActive: true, hideFromBudget: false },
    include: { section: true },
  });
  const categoryIds = categories.map((c) => c.id);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const monthStrings = Array.from(
    { length: 12 },
    (_, m) => `${year}-${String(m + 1).padStart(2, "0")}`,
  );

  const [snapshots, assignments] = categoryIds.length
    ? await Promise.all([
        prisma.categoryPlanSnapshot.findMany({
          where: { categoryId: { in: categoryIds }, month: { in: monthStrings } },
        }),
        prisma.categoryAssignment.findMany({
          where: { categoryId: { in: categoryIds }, month: { in: monthStrings } },
        }),
      ])
    : [[], []];

  function plannedFor(categoryId: string, month: string): number {
    const snap = snapshots.find((s) => s.categoryId === categoryId && s.month === month);
    if (!snap) return 0;
    const category = categoryById.get(categoryId);
    return monthlyTargetAmount({
      targetAmount: snap.targetAmount != null ? Number(snap.targetAmount) : null,
      targetRepeatType: snap.targetRepeatType,
      savingsPerMonth: snap.savingsPerMonth != null ? Number(snap.savingsPerMonth) : null,
      savingsPerQuarter: snap.savingsPerQuarter != null ? Number(snap.savingsPerQuarter) : null,
      savingsPerYear: snap.savingsPerYear != null ? Number(snap.savingsPerYear) : null,
      startDate: category?.startDate ? category.startDate.toISOString().slice(0, 10) : null,
      targetDueDate: category?.targetDueDate
        ? category.targetDueDate.toISOString().slice(0, 10)
        : null,
    });
  }

  function actualFor(categoryId: string, month: string): number {
    const a = assignments.find((x) => x.categoryId === categoryId && x.month === month);
    return a ? Number(a.assigned) + Number(a.activity) : 0;
  }

  const months: BudgetVsActualMonthRow[] = monthStrings.map((month, i) => ({
    month: i,
    planned: categoryIds.reduce((s, id) => s + plannedFor(id, month), 0),
    actual: categoryIds.reduce((s, id) => s + actualFor(id, month), 0),
  }));

  const monthsWithData = months.filter((m) => m.planned !== 0 || m.actual !== 0);
  const latestMonth = monthsWithData.length
    ? monthStrings[monthsWithData[monthsWithData.length - 1].month]
    : null;

  const sectionBreakdown: BudgetVsActualSectionRow[] = [];
  if (latestMonth) {
    const sectionsSeen = new Map<string, string>();
    for (const c of categories) sectionsSeen.set(c.section.id, c.section.name);
    for (const [sectionId, sectionName] of sectionsSeen) {
      const sectionCategoryIds = categories
        .filter((c) => c.section.id === sectionId)
        .map((c) => c.id);
      sectionBreakdown.push({
        sectionId,
        sectionName,
        planned: sectionCategoryIds.reduce((s, id) => s + plannedFor(id, latestMonth), 0),
        actual: sectionCategoryIds.reduce((s, id) => s + actualFor(id, latestMonth), 0),
      });
    }
  }

  return { months, sectionBreakdown, latestMonth };
}

interface PayeeSpendRow {
  payeeId: string;
  payeeName: string;
  total: number;
  count: number;
}

export interface PayeeReportData {
  payees: PayeeSpendRow[];
}

export async function getPayeeReport(budgetId: string, year: number): Promise<PayeeReportData> {
  const { start, end } = yearRange(year);
  const transactions = await prisma.transaction.findMany({
    where: { account: { budgetId }, pendingApproval: false, postDate: { gte: start, lt: end } },
    select: { payeeId: true, debit: true, credit: true, payee: { select: { name: true } } },
  });

  const byPayee = new Map<string, PayeeSpendRow>();
  for (const t of transactions) {
    const spend = Number(t.debit ?? 0) - Number(t.credit ?? 0);
    const row = byPayee.get(t.payeeId) ?? {
      payeeId: t.payeeId,
      payeeName: t.payee.name,
      total: 0,
      count: 0,
    };
    row.total += spend;
    row.count += 1;
    byPayee.set(t.payeeId, row);
  }

  return { payees: Array.from(byPayee.values()).sort((a, b) => b.total - a.total) };
}

interface GoalProgressRow {
  categoryId: string;
  name: string;
  sectionName: string;
  targetTotal: number;
  current: number;
  pct: number;
  onTrack: boolean;
  requiredMonthly: number;
  contributingMonthly: number;
  targetDueDate: string | null;
}

export interface GoalProgressData {
  goals: GoalProgressRow[];
}

export async function getGoalProgressReport(budgetId: string): Promise<GoalProgressData> {
  const month = currentYearMonth();
  const categories = await prisma.category.findMany({
    where: {
      section: { budgetId },
      isActive: true,
      hideFromBudget: false,
      OR: [{ targetAmount: { not: null } }, { targetRepeatType: { not: null } }],
    },
    include: { section: true },
  });
  const categoryIds = categories.map((c) => c.id);
  const assignments = categoryIds.length
    ? await prisma.categoryAssignment.findMany({
        where: { categoryId: { in: categoryIds }, month },
      })
    : [];
  const assignmentByCategory = new Map(assignments.map((a) => [a.categoryId, a]));

  const goals: GoalProgressRow[] = categories.map((c) => {
    const fields: CategoryTargetFields = {
      targetAmount: c.targetAmount != null ? Number(c.targetAmount) : null,
      targetRepeatType: c.targetRepeatType,
      savingsPerMonth: c.savingsPerMonth != null ? Number(c.savingsPerMonth) : null,
      savingsPerQuarter: c.savingsPerQuarter != null ? Number(c.savingsPerQuarter) : null,
      savingsPerYear: c.savingsPerYear != null ? Number(c.savingsPerYear) : null,
      startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
      targetDueDate: c.targetDueDate ? c.targetDueDate.toISOString().slice(0, 10) : null,
    };
    const assignment = assignmentByCategory.get(c.id);
    const carryover = assignment ? Number(assignment.carryover) : 0;
    const assigned = assignment ? Number(assignment.assigned) : 0;
    const available = assignment ? Number(assignment.available) : 0;

    const targetTotal =
      c.targetRepeatType === "long_term"
        ? (fields.targetAmount ?? 0)
        : c.targetRepeatType === "yearly"
          ? (fields.savingsPerYear ?? 0)
          : c.targetRepeatType === "quarterly"
            ? (fields.savingsPerQuarter ?? 0)
            : (fields.savingsPerMonth ?? fields.targetAmount ?? 0);

    const requiredMonthly = remainingMonthlyTargetAmount(
      fields,
      c.monthNeededBy,
      c.monthlyFundingGoal,
      carryover,
      month,
    );
    const underfunded = Math.round(assigned * 100) < Math.round(requiredMonthly * 100);

    return {
      categoryId: c.id,
      name: c.name,
      sectionName: c.section.name,
      targetTotal,
      current: Math.max(0, available),
      pct: targetTotal > 0 ? Math.min(1, Math.max(0, available / targetTotal)) : 0,
      onTrack: !underfunded,
      requiredMonthly,
      contributingMonthly: assigned,
      targetDueDate: fields.targetDueDate,
    };
  });

  return { goals };
}

interface DebtRow {
  liabilityId: string;
  name: string;
  balance: number;
  startingBalance: number;
  pctPaidOff: number;
  payoffMonths: number | null;
  payoffDate: string | null;
}

export interface DebtPayoffData {
  debts: DebtRow[];
  debtFreeMonths: number | null;
  debtFreeDate: string | null;
  projection: number[];
  projectionMonths: string[];
}

const DEBT_PROJECTION_HORIZON_MONTHS = 36;

function projectRemainingBalance(
  balance: number,
  interestRate: number | null,
  minimumPayment: number | null,
  maxMonths: number,
): number[] {
  const series: number[] = [];
  if (balance <= 0) return series;
  if (!minimumPayment || minimumPayment <= 0) return Array(maxMonths).fill(balance);

  const dailyRate = (interestRate ?? 0) / 100 / 365;
  let remaining = balance;
  let cursor = new Date();
  for (let m = 0; m < maxMonths; m++) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const days = Math.round((next.getTime() - cursor.getTime()) / 86_400_000);
    const interest = remaining * dailyRate * days;
    const principal = minimumPayment - interest;
    if (principal > 0) remaining = Math.max(0, remaining - principal);
    series.push(remaining);
    cursor = next;
    if (remaining <= 0) break;
  }
  return series;
}

export async function getDebtPayoffReport(budgetId: string): Promise<DebtPayoffData> {
  const liabilities = await prisma.liability.findMany({ where: { budgetId } });

  const debts: DebtRow[] = [];
  const projections: number[][] = [];
  let debtFreeMonths: number | null = null;

  for (const l of liabilities) {
    const balance = Number(l.balance);
    const interestRate = l.interestRate != null ? Number(l.interestRate) : null;
    const minimumPayment = l.minimumPayment != null ? Number(l.minimumPayment) : null;
    const projected = computePayoffProjection({ balance, interestRate, minimumPayment });

    debts.push({
      liabilityId: l.id,
      name: l.name,
      balance,
      startingBalance: Number(l.startingBalance),
      pctPaidOff: percentPaidOff({ startingBalance: Number(l.startingBalance), balance }),
      payoffMonths: projected?.months ?? null,
      payoffDate: projected?.payoffDate ?? null,
    });
    if (projected && (debtFreeMonths === null || projected.months > debtFreeMonths)) {
      debtFreeMonths = projected.months;
    }
    projections.push(
      projectRemainingBalance(
        balance,
        interestRate,
        minimumPayment,
        DEBT_PROJECTION_HORIZON_MONTHS,
      ),
    );
  }

  const projection = Array.from({ length: DEBT_PROJECTION_HORIZON_MONTHS }, (_, i) =>
    projections.reduce((sum, series) => sum + (series[i] ?? series[series.length - 1] ?? 0), 0),
  );

  const now = new Date();
  const projectionMonths = Array.from({ length: DEBT_PROJECTION_HORIZON_MONTHS }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + i, 1).toISOString().slice(0, 10),
  );
  const debtFreeDate =
    debtFreeMonths == null
      ? null
      : new Date(now.getFullYear(), now.getMonth() + debtFreeMonths, 1).toISOString().slice(0, 10);

  return {
    debts: debts.sort((a, b) => b.balance - a.balance),
    debtFreeMonths,
    debtFreeDate,
    projection,
    projectionMonths,
  };
}

export interface CashFlowData {
  months: { month: number; net: number }[];
  yearTotal: number;
}

export async function getCashFlowReport(budgetId: string, year: number): Promise<CashFlowData> {
  const { start, end } = yearRange(year);
  const transactions = await prisma.transaction.findMany({
    where: { account: { budgetId }, pendingApproval: false, postDate: { gte: start, lt: end } },
    select: { postDate: true, debit: true, credit: true },
  });

  const monthly = Array(12).fill(0);
  for (const t of transactions) {
    monthly[t.postDate.getUTCMonth()] += Number(t.credit ?? 0) - Number(t.debit ?? 0);
  }

  return {
    months: monthly.map((net, month) => ({ month, net })),
    yearTotal: monthly.reduce((a, b) => a + b, 0),
  };
}
