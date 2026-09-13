import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { getSidebarAccounts, requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import AccountsListView from "./AccountsListView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("accounts.listPage.metaTitle") };
}

export default async function AccountsListPage() {
  const { user, workspace } = await requireFeature(Feature.transactions);
  const [settings, accounts] = await Promise.all([
    getPlatformSettings(),
    getSidebarAccounts(workspace.budget.id),
  ]);

  return (
    <AccountsListView
      locale={user.locale}
      currencyCode={settings.currencyCode}
      cash={accounts.cash}
      credit={accounts.credit}
    />
  );
}
