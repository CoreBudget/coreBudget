import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform";
import {
  getAccessibleHouseholds,
  getFeaturePermissions,
  getSidebarAccounts,
  getSidebarNetWorth,
  resolveCurrentWorkspace,
} from "@/lib/workspace";
import { getSidebarVisibilityPreferences } from "@/lib/sidebarVisibility";
import { getPlatformFeatureToggles } from "@/lib/platformFeatures";
import { Feature } from "@/generated/prisma/client";
import AppShell from "./AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const settings = await getPlatformSettings();

  const [households, workspace, sidebarVisibilityByPage, featureToggles] = await Promise.all([
    getAccessibleHouseholds(user.id),
    resolveCurrentWorkspace(user.id),
    getSidebarVisibilityPreferences(user.id),
    getPlatformFeatureToggles(),
  ]);

  const [permissions, accounts, netWorth] = workspace
    ? await Promise.all([
        getFeaturePermissions(user.id, workspace.budget.id),
        getSidebarAccounts(workspace.budget.id),
        getSidebarNetWorth(workspace.budget.id),
      ])
    : [null, null, null];

  return (
    <AppShell
      userName={user.name}
      userEmail={user.email}
      isAdmin={user.isAdmin}
      currencyCode={settings.currencyCode}
      locale={user.locale}
      sidebarAccountsOpen={user.sidebarAccountsOpen}
      sidebarNetWorthOpen={user.sidebarNetWorthOpen}
      seenTours={user.seenTours}
      sidebarVisibilityByPage={sidebarVisibilityByPage}
      incomeCalculatorEnabled={featureToggles[Feature.income_calculator]}
      households={households}
      workspace={workspace}
      permissions={permissions}
      accounts={accounts}
      netWorth={netWorth}
    >
      {children}
    </AppShell>
  );
}
