import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { currentYearMonth, isValidYearMonth } from "@/lib/month";
import { getBudgetMonthData } from "@/lib/budgetRecalc";
import BudgetPanel from "./BudgetPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("budget.metaTitle") };
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { user, workspace, level } = await requireFeature(Feature.budget_envelope);
  const settings = await getPlatformSettings();
  const { month: monthParam } = await searchParams;
  const month = monthParam && isValidYearMonth(monthParam) ? monthParam : currentYearMonth();

  const sections = await prisma.section.findMany({
    where: {
      budgetId: workspace.budget.id,
      isActive: true,
      isIncome: false,
      isCreditCardPayment: false,
    },
    orderBy: { order: "asc" },
    include: {
      categories: {
        where: { isActive: true, hideFromBudget: false },
        orderBy: { order: "asc" },
      },
    },
  });

  const categoryIds = sections.flatMap((s) => s.categories.map((c) => c.id));

  const [{ rows, activityDetails, readyToAssign }, favorites] = await Promise.all([
    getBudgetMonthData(workspace.budget.id, month, categoryIds),
    prisma.favoriteCategory.findMany({
      where: { userId: user.id, categoryId: { in: categoryIds } },
    }),
  ]);
  const favoriteCategoryIds = new Set(favorites.map((f) => f.categoryId));

  return (
    <BudgetPanel
      canEdit={level === "edit"}
      locale={user.locale}
      currencyCode={settings.currencyCode}
      month={month}
      readyToAssign={readyToAssign.toString()}
      sectionsDefaultOpen={user.budgetSectionsDefaultOpen}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        categories: s.categories.map((c) => {
          const row = rows.get(c.id);
          return {
            id: c.id,
            name: c.name,
            isFavorite: favoriteCategoryIds.has(c.id),
            hasRow: row?.hasRow ?? false,
            assigned: (row?.assigned ?? 0).toString(),
            activity: (row?.activity ?? 0).toString(),
            carryover: (row?.carryover ?? 0).toString(),
            available: (row?.available ?? 0).toString(),
            targetAmount: c.targetAmount?.toString() ?? null,
            targetRepeatType: c.targetRepeatType,
            monthNeededBy: c.monthNeededBy,
            monthlyFundingGoal: c.monthlyFundingGoal,
            savingsPerMonth: c.savingsPerMonth?.toString() ?? null,
            savingsPerQuarter: c.savingsPerQuarter?.toString() ?? null,
            savingsPerYear: c.savingsPerYear?.toString() ?? null,
            startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
            targetDueDate: c.targetDueDate ? c.targetDueDate.toISOString().slice(0, 10) : null,
            activityDetails: (activityDetails.get(c.id) ?? []).map((d) => ({
              transactionId: d.transactionId,
              date: d.date,
              payeeName: d.payeeName,
              accountName: d.accountName,
              amount: d.amount.toString(),
            })),
          };
        }),
      }))}
    />
  );
}
