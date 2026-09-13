import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { getSidebarNetWorth, requireAnyFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import NetWorthListView from "./NetWorthListView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("netWorth.listPage.metaTitle") };
}

export default async function NetWorthListPage() {
  const { user, workspace, levels } = await requireAnyFeature([
    Feature.net_worth_assets,
    Feature.net_worth_liabilities,
  ]);
  const [settings, netWorth] = await Promise.all([
    getPlatformSettings(),
    getSidebarNetWorth(workspace.budget.id),
  ]);

  return (
    <NetWorthListView
      assetsVisible={levels[Feature.net_worth_assets] !== "no_access"}
      canEditAssets={levels[Feature.net_worth_assets] === "edit"}
      liabilitiesVisible={levels[Feature.net_worth_liabilities] !== "no_access"}
      canEditLiabilities={levels[Feature.net_worth_liabilities] === "edit"}
      locale={user.locale}
      currencyCode={settings.currencyCode}
      assets={netWorth.assets}
      liabilities={netWorth.liabilities}
    />
  );
}
