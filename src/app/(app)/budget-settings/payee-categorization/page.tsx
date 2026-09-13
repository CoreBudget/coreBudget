import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/workspace";
import PayeeCategorizationPanel from "./PayeeCategorizationPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("budgetSettings.payeeCategorization.metaTitle") };
}

export default async function PayeeCategorizationSettingsPage() {
  const { workspace, level } = await requireFeature(Feature.budget_settings);

  const [mappings, payees, sections] = await Promise.all([
    prisma.payeeAutoCategory.findMany({
      where: { budgetId: workspace.budget.id },
      include: { payee: true, category: { include: { section: true } } },
      orderBy: { payee: { name: "asc" } },
    }),
    prisma.payee.findMany({ orderBy: { name: "asc" } }),
    prisma.section.findMany({
      where: { budgetId: workspace.budget.id, isActive: true },
      orderBy: { order: "asc" },
      include: { categories: { where: { isActive: true }, orderBy: { order: "asc" } } },
    }),
  ]);

  return (
    <PayeeCategorizationPanel
      canEdit={level === "edit"}
      mappings={mappings.map((m) => ({
        payeeId: m.payeeId,
        payeeName: m.payee.name,
        payeeAutoCategoryEnabled: m.payee.enableAutoCategory,
        categoryId: m.categoryId,
        categoryName: m.category.name,
        sectionName: m.category.section.name,
      }))}
      payees={payees.map((p) => ({ id: p.id, name: p.name }))}
      sections={sections.map((s) => ({
        id: s.id,
        name: s.name,
        categories: s.categories.map((c) => ({ id: c.id, name: c.name })),
      }))}
    />
  );
}
