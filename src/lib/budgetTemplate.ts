import "server-only";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { td } from "@/lib/i18n/translateDynamicKey";

const DEFAULT_BUDGET_TEMPLATE: Array<{
  nameKey: string;
  isIncome?: boolean;
  isSavings?: boolean;
  isCreditCardPayment?: boolean;
  categoryKeys: string[];
}> = [
  {
    nameKey: "budgetTemplate.sections.income",
    isIncome: true,
    categoryKeys: ["paycheck", "otherIncome"],
  },
  {
    nameKey: "budgetTemplate.sections.housing",
    categoryKeys: ["rentMortgage", "electricity", "gas", "water", "internet", "homeMaintenance"],
  },
  { nameKey: "budgetTemplate.sections.food", categoryKeys: ["groceries", "diningOut"] },
  {
    nameKey: "budgetTemplate.sections.transportation",
    categoryKeys: ["fuel", "autoInsurance", "autoMaintenance"],
  },
  {
    nameKey: "budgetTemplate.sections.personal",
    categoryKeys: ["phone", "subscriptions", "personalCare"],
  },
  {
    nameKey: "budgetTemplate.sections.health",
    categoryKeys: ["healthInsurance", "medicalDental"],
  },
  {
    nameKey: "budgetTemplate.sections.savings",
    isSavings: true,
    categoryKeys: ["emergencyFund"],
  },
  {
    nameKey: "budgetTemplate.sections.giving",
    categoryKeys: ["giftsDonations"],
  },
  {
    nameKey: "budgetTemplate.sections.miscellaneous",
    categoryKeys: ["miscellaneous"],
  },
];

export async function applyDefaultBudgetTemplate(budgetId: string): Promise<void> {
  const t = await getTranslations();

  for (const [sectionOrder, section] of DEFAULT_BUDGET_TEMPLATE.entries()) {
    await prisma.section.create({
      data: {
        budgetId,
        name: td(t, section.nameKey),
        isIncome: section.isIncome ?? false,
        isSavings: section.isSavings ?? false,
        isCreditCardPayment: section.isCreditCardPayment ?? false,
        order: sectionOrder,
        categories: {
          create: section.categoryKeys.map((key, order) => ({
            name: td(t, `budgetTemplate.categories.${key}`),
            order,
          })),
        },
      },
    });
  }
}
