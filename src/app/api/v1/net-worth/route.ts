import { NextResponse, type NextRequest } from "next/server";
import { Feature } from "@/generated/prisma/client";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { getNetWorthSummary } from "@/lib/dashboard";
import { getPlatformSettings } from "@/lib/platform";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, [
    Feature.net_worth_assets,
    Feature.net_worth_liabilities,
  ]);
  if (auth instanceof NextResponse) return auth;

  const [summary, settings] = await Promise.all([
    getNetWorthSummary(auth.budgetId),
    getPlatformSettings(),
  ]);

  return NextResponse.json({
    ...summary,
    currencyCode: settings.currencyCode,
    generatedAt: new Date().toISOString(),
  });
}
