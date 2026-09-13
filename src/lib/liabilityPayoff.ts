export function computePayoffProjection({
  balance,
  interestRate,
  minimumPayment,
}: {
  balance: number;
  interestRate: number | null;
  minimumPayment: number | null;
}): { months: number; payoffDate: string } | null {
  if (balance <= 0) return { months: 0, payoffDate: new Date().toISOString().slice(0, 10) };
  if (!minimumPayment || minimumPayment <= 0) return null;

  const dailyRate = (interestRate ?? 0) / 100 / 365;
  let remaining = balance;
  let cursor = new Date();
  const MAX_MONTHS = 360;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const daysInMonth = Math.round((next.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24));
    const interest = remaining * dailyRate * daysInMonth;
    const principal = minimumPayment - interest;
    if (principal <= 0) return null;

    remaining -= principal;
    cursor = next;
    if (remaining <= 0) {
      return { months: month, payoffDate: cursor.toISOString().slice(0, 10) };
    }
  }
  return null;
}

export interface AmortizationScheduleRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  endingBalance: number;
  actual: boolean;
}

export function buildAmortizationSchedule({
  loanStartDate,
  startingBalance,
  interestRate,
  minimumPayment,
  payments,
}: {
  loanStartDate: string;
  startingBalance: number;
  interestRate: number | null;
  minimumPayment: number | null;
  payments: {
    date: string;
    paymentAmount: number;
    principal: number;
    interest: number;
    endingBalance: number;
  }[];
}): AmortizationScheduleRow[] {
  const dailyRate = (interestRate ?? 0) / 100 / 365;
  const actualByMonth = new Map<string, (typeof payments)[number]>();
  for (const p of payments) actualByMonth.set(p.date.slice(0, 7), p);

  const rows: AmortizationScheduleRow[] = [];
  let remaining = startingBalance;
  let cursor = new Date(loanStartDate);
  const MAX_MONTHS = 360;

  for (let month = 1; month <= MAX_MONTHS && remaining > 0; month++) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const daysInMonth = Math.round((next.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24));
    const calcInterest = remaining * dailyRate * daysInMonth;
    const calcPrincipal = (minimumPayment ?? 0) - calcInterest;

    const actual = actualByMonth.get(next.toISOString().slice(0, 7));
    if (actual) {
      rows.push({
        month,
        date: actual.date,
        payment: actual.paymentAmount,
        principal: actual.principal,
        interest: actual.interest,
        endingBalance: actual.endingBalance,
        actual: true,
      });
      remaining = actual.endingBalance;
    } else {
      if (calcPrincipal <= 0) break;
      remaining = Math.max(0, remaining - calcPrincipal);
      rows.push({
        month,
        date: next.toISOString().slice(0, 10),
        payment: minimumPayment ?? 0,
        principal: calcPrincipal,
        interest: calcInterest,
        endingBalance: remaining,
        actual: false,
      });
    }
    cursor = next;
  }
  return rows;
}

export function percentPaidOff({
  startingBalance,
  balance,
}: {
  startingBalance: number;
  balance: number;
}): number {
  if (startingBalance <= 0) return 0;
  const pct = (startingBalance - balance) / startingBalance;
  return Math.min(1, Math.max(0, pct));
}
