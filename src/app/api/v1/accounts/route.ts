import { NextResponse, type NextRequest } from "next/server";
import { Feature } from "@/generated/prisma/client";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { getSidebarAccounts } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request, Feature.transactions);
  if (auth instanceof NextResponse) return auth;

  const [sidebarAccounts, settings] = await Promise.all([
    getSidebarAccounts(auth.budgetId),
    getPlatformSettings(),
  ]);

  const accounts = [...sidebarAccounts.cash, ...sidebarAccounts.credit].map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
  }));

  return NextResponse.json({
    accounts,
    currencyCode: settings.currencyCode,
    generatedAt: new Date().toISOString(),
  });
}
