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

  return NextResponse.json({
    month,
    categories,
    currencyCode: settings.currencyCode,
    generatedAt: new Date().toISOString(),
  });
}
