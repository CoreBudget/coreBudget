import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { sectionType } from "../budget-settings/categories/sectionType";
import PlanPanel from "./PlanPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("plan.metaTitle") };
}

export default async function PlanPage() {
  const { user, workspace, level } = await requireFeature(Feature.plan);
  const settings = await getPlatformSettings();

  const sections = await prisma.section.findMany({
    where: {
      budgetId: workspace.budget.id,
      isActive: true,
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

  return (
    <PlanPanel
      canEdit={level === "edit"}
      locale={user.locale}
      dateFormatPreference={user.dateFormatPreference}
      currencyCode={settings.currencyCode}
      sectionsDefaultOpen={user.planSectionsDefaultOpen}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        type: sectionType(s),
        categories: s.categories.map((c) => ({
          id: c.id,
          name: c.name,
          targetRepeatType: c.targetRepeatType,
          targetAmount: c.targetAmount?.toString() ?? null,
          savingsPerMonth: c.savingsPerMonth?.toString() ?? null,
          dayOfMonth: c.dayOfMonth,
          monthlyFundingGoal: c.monthlyFundingGoal,
          savingsPerQuarter: c.savingsPerQuarter?.toString() ?? null,
          quarterlyMonths: (c.quarterlyMonths as number[] | null) ?? [],
          savingsPerYear: c.savingsPerYear?.toString() ?? null,
          monthNeededBy: c.monthNeededBy,
          startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
          targetDueDate: c.targetDueDate ? c.targetDueDate.toISOString().slice(0, 10) : null,
          notes: c.notes,
        })),
      }))}
    />
  );
}
