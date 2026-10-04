import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Returns the id of the hidden category that tracks payments to one credit card, creating it (and
 * the credit card payment section that holds it) on first use. The category is named after the
 * card account and hidden from the budget, so it only shows up on transactions.
 */
export async function findOrCreateCreditCardPaymentCategory(
  budgetId: string,
  cardName: string,
  sectionName: string,
): Promise<string> {
  const name = cardName.trim();

  let section = await prisma.section.findFirst({
    where: { budgetId, isCreditCardPayment: true },
    orderBy: { order: "asc" },
  });
  if (!section) {
    const lastSection = await prisma.section.aggregate({
      where: { budgetId },
      _max: { order: true },
    });
    section = await prisma.section.create({
      data: {
        budgetId,
        name: sectionName,
        isCreditCardPayment: true,
        order: (lastSection._max.order ?? -1) + 1,
      },
    });
  }

  const existing = await prisma.category.findFirst({
    where: {
      sectionId: section.id,
      hideFromBudget: true,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) return existing.id;

  const lastCategory = await prisma.category.aggregate({
    where: { sectionId: section.id },
    _max: { order: true },
  });
  const created = await prisma.category.create({
    data: {
      sectionId: section.id,
      name,
      hideFromBudget: true,
      order: (lastCategory._max.order ?? -1) + 1,
    },
  });
  return created.id;
}
