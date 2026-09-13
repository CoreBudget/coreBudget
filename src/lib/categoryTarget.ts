export interface CategoryTargetFields {
  targetAmount: number | null;
  targetRepeatType: string | null;
  savingsPerMonth: number | null;
  savingsPerQuarter: number | null;
  savingsPerYear: number | null;
  startDate: string | null;
  targetDueDate: string | null;
}

export function monthsBetweenDates(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth());
  return Math.max(0, months);
}

export function monthlyTargetAmount(category: CategoryTargetFields): number {
  switch (category.targetRepeatType) {
    case "monthly":
      return category.savingsPerMonth ?? 0;
    case "quarterly":
      return (category.savingsPerQuarter ?? 0) / 3;
    case "yearly":
      return (category.savingsPerYear ?? 0) / 12;
    case "long_term": {
      const months = monthsBetweenDates(category.startDate, category.targetDueDate);
      return months > 0 ? (category.targetAmount ?? 0) / months : 0;
    }
    default:
      return category.targetAmount ?? 0;
  }
}

function monthsRemainingInYear(fromMonth: string, monthNeededBy: number): number {
  const currentIndex = Number(fromMonth.split("-")[1]) - 1;
  const diff = (((monthNeededBy - currentIndex) % 12) + 12) % 12;
  return diff + 1;
}

export function remainingMonthlyTargetAmount(
  category: CategoryTargetFields,
  monthNeededBy: string | null,
  monthlyFundingGoal: string | null,
  carryover: number,
  currentMonth: string,
): number {
  switch (category.targetRepeatType) {
    case "monthly": {
      if (monthlyFundingGoal === "reach_target") {
        return Math.max(0, (category.savingsPerMonth ?? 0) - carryover);
      }
      return category.savingsPerMonth ?? 0;
    }
    case "yearly": {
      const monthIndex = monthNeededBy != null ? Number(monthNeededBy) : 0;
      const remaining = Math.max(0, (category.savingsPerYear ?? 0) - carryover);
      const months = monthsRemainingInYear(currentMonth, monthIndex);
      return remaining / months;
    }
    case "long_term": {
      const months = monthsBetweenDates(`${currentMonth}-01`, category.targetDueDate);
      const remaining = Math.max(0, (category.targetAmount ?? 0) - carryover);
      return months > 0 ? remaining / months : remaining;
    }
    default:
      return monthlyTargetAmount(category);
  }
}
