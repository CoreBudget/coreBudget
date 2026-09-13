import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { resolveCurrentWorkspace } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { currentYearMonth } from "@/lib/month";
import { getDashboardData } from "@/lib/dashboard";
import ComingSoon from "../../_shared/ComingSoon";
import DashboardPanel from "./DashboardPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("dashboard.metaTitle") };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const workspace = await resolveCurrentWorkspace(user.id);

  if (!workspace) {
    const t = await getTranslations();
    return (
      <ComingSoon
        title={t("dashboard.welcomeTitle", { name: user.name })}
        subtitle={t("dashboard.noWorkspaceSubtitle")}
      />
    );
  }

  const [settings, month] = [await getPlatformSettings(), currentYearMonth()];
  const data = await getDashboardData(workspace.budget.id, user.id, month);

  return (
    <DashboardPanel
      userName={user.name}
      locale={user.locale}
      currencyCode={settings.currencyCode}
      month={month}
      summary={{
        netWorth: data.summary.netWorth.toString(),
        totalCash: data.summary.totalCash.toString(),
        totalCredit: data.summary.totalCredit.toString(),
        totalAssets: data.summary.totalAssets.toString(),
        totalLoans: data.summary.totalLoans.toString(),
      }}
      actionItems={data.actionItems}
      currentMonthBudget={{
        assigned: data.currentMonthBudget.assigned.toString(),
        activity: data.currentMonthBudget.activity.toString(),
        available: data.currentMonthBudget.available.toString(),
        mostOverspent: data.currentMonthBudget.mostOverspent.map((o) => ({
          categoryId: o.categoryId,
          categoryName: o.categoryName,
          available: o.available.toString(),
        })),
      }}
      debtPayoff={data.debtPayoff}
      recentTransactions={data.recentTransactions.map((t) => ({
        ...t,
        amount: t.amount.toString(),
      }))}
      upcomingScheduled={data.upcomingScheduled.map((u) => ({ ...u, amount: u.amount.toString() }))}
      upcomingNetChange={data.upcomingNetChange.toString()}
      favoriteCategories={data.favoriteCategories.map((c) => ({
        ...c,
        assigned: c.assigned.toString(),
        activity: c.activity.toString(),
        available: c.available.toString(),
      }))}
    />
  );
}
