import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/workspace";
import { sectionType } from "./sectionType";
import CategoriesPanel from "./CategoriesPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("budgetSettings.categories.metaTitle") };
}

export default async function CategoriesSettingsPage() {
  const { workspace, level } = await requireFeature(Feature.budget_settings);

  const sections = await prisma.section.findMany({
    where: { budgetId: workspace.budget.id },
    orderBy: { order: "asc" },
    include: {
      categories: {
        where: { hideFromBudget: false },
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { transactions: true, transactionSplits: true },
          },
        },
      },
    },
  });

  return (
    <CategoriesPanel
      canEdit={level === "edit"}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        type: sectionType(s),
        isActive: s.isActive,
        categories: s.categories.map((c) => ({
          id: c.id,
          name: c.name,
          isActive: c.isActive,
          hasHistory: c._count.transactions > 0 || c._count.transactionSplits > 0,
        })),
      }))}
    />
  );
}
