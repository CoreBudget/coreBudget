import "server-only";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";

export async function grantFullBudgetAccess(userId: string, budgetId: string): Promise<void> {
  await prisma.budgetAccess.create({ data: { userId, budgetId } });
  await prisma.featurePermission.createMany({
    data: Object.values(Feature).map((feature) => ({
      userId,
      budgetId,
      feature,
      level: "edit" as const,
    })),
  });
}
