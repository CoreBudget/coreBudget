import "server-only";
import { prisma } from "@/lib/prisma";
import { currentYearMonth } from "@/lib/month";

export async function captureCategoryPlanSnapshots(month: string = currentYearMonth()) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: { section: { select: { budgetId: true } } },
  });

  const { count } = await prisma.categoryPlanSnapshot.createMany({
    data: categories.map((category) => ({
      budgetId: category.section.budgetId,
      categoryId: category.id,
      month,
      targetAmount: category.targetAmount,
      targetRepeatType: category.targetRepeatType,
      monthlyFundingGoal: category.monthlyFundingGoal,
      savingsPerMonth: category.savingsPerMonth,
      savingsPerQuarter: category.savingsPerQuarter,
      quarterlyMonths: category.quarterlyMonths ?? undefined,
      savingsPerYear: category.savingsPerYear,
    })),
    skipDuplicates: true,
  });

  return { count, month };
}
