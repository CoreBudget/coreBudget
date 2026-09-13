import { NextResponse, type NextRequest } from "next/server";
import { Feature } from "@/generated/prisma/client";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { getBudgetCategoryStatus } from "@/lib/budgetRecalc";
import { getPlatformSettings } from "@/lib/platform";
import { currentYearMonth } from "@/lib/month";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, Feature.budget_envelope);
  if (auth instanceof NextResponse) return auth;

  const month = currentYearMonth();
  const [categories, settings] = await Promise.all([
    getBudgetCategoryStatus(auth.budgetId, month),
    getPlatformSettings(),
  ]);

  let assigned = 0;
  let activity = 0;
  let available = 0;
  let categoriesOverBudget = 0;
  for (const c of categories) {
    assigned += c.assigned;
    activity += c.activity;
    available += c.available;
    if (c.available < 0) categoriesOverBudget += 1;
  }

  return NextResponse.json({
    month,
    assigned,
    activity,
    available,
    categoriesOverBudget,
    currencyCode: settings.currencyCode,
    generatedAt: new Date().toISOString(),
  });
}
