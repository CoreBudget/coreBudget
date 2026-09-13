import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { getFeaturePermissions, resolveCurrentWorkspace } from "@/lib/workspace";
import { getPagePreferences } from "@/lib/pagePreferences";
import { getSidebarVisibilityPreferences } from "@/lib/sidebarVisibility";
import PreferencesPanel from "./PreferencesPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.preferences.metaTitle") };
}

export default async function PreferencesPage() {
  const user = await requireUser();
  const workspace = await resolveCurrentWorkspace(user.id);
  const permissions = workspace ? await getFeaturePermissions(user.id, workspace.budget.id) : null;
  const [pagePreferences, sidebarVisibilityByPage] = await Promise.all([
    getPagePreferences(user.id),
    getSidebarVisibilityPreferences(user.id),
  ]);

  return (
    <PreferencesPanel
      isAdmin={user.isAdmin}
      permissions={permissions}
      sidebarAccountsOpen={user.sidebarAccountsOpen}
      sidebarNetWorthOpen={user.sidebarNetWorthOpen}
      sidebarVisibilityByPage={sidebarVisibilityByPage}
      defaultLedgerSortColumn={user.defaultLedgerSortColumn}
      defaultLedgerSortDirection={user.defaultLedgerSortDirection}
      defaultLedgerDatePreset={user.defaultLedgerDatePreset}
      planSectionsDefaultOpen={user.planSectionsDefaultOpen}
      budgetSectionsDefaultOpen={user.budgetSectionsDefaultOpen}
      pagePreferences={pagePreferences}
    />
  );
}
