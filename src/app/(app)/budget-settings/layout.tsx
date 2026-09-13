import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Feature } from "@/generated/prisma/client";
import { getFeaturePermissions, requireFeature } from "@/lib/workspace";
import AdminNavLink from "../../admin/AdminNavLink";
import SectionMobileMenu from "../../_shared/SectionMobileMenu";
import LayoutTour from "../../_shared/tours/LayoutTour";

export default async function BudgetSettingsLayout({ children }: { children: ReactNode }) {
  const { user, workspace } = await requireFeature(Feature.budget_settings);
  const permissions = await getFeaturePermissions(user.id, workspace.budget.id);
  const canSee = (feature: Feature) => permissions[feature] !== "no_access";
  const t = await getTranslations();

  const tabs = [
    { href: "/budget-settings/categories", label: t("budgetSettings.layout.tabs.categories") },
    {
      href: "/budget-settings/accounts",
      label: t("budgetSettings.layout.tabs.accountsNetWorth"),
    },
    ...(canSee(Feature.repeating_transactions)
      ? [
          {
            href: "/budget-settings/repeating",
            label: t("budgetSettings.layout.tabs.repeatingTransactions"),
          },
        ]
      : []),
    {
      href: "/budget-settings/payee-categorization",
      label: t("budgetSettings.layout.tabs.payeeAutoCategorization"),
    },
    ...(canSee(Feature.audit_log)
      ? [{ href: "/budget-settings/audit-log", label: t("budgetSettings.layout.tabs.auditLog") }]
      : []),
  ];

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: "16px" }}
      >
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 700, color: "text.primary", m: 0 }}
        >
          {t("budgetSettings.layout.title")}
        </Typography>
        <SectionMobileMenu tabs={tabs} dataTour="budget-settings-tabs-mobile" />
      </Stack>
      <LayoutTour
        tourId="page:budget-settings"
        desktopSteps={[
          {
            element: '[data-tour="budget-settings-tabs-desktop"]',
            title: t("budgetSettings.layout.tour.title"),
            description: t("budgetSettings.layout.tour.description"),
            side: "right",
          },
        ]}
        mobileSteps={[
          {
            element: '[data-tour="budget-settings-tabs-mobile"]',
            title: t("budgetSettings.layout.tour.title"),
            description: t("budgetSettings.layout.tour.description"),
            side: "bottom",
          },
        ]}
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ gap: { xs: "12px", sm: "24px" }, alignItems: "flex-start" }}
      >
        <Stack
          component="nav"
          data-tour="budget-settings-tabs-desktop"
          sx={{
            display: { xs: "none", sm: "flex" },
            width: 220,
            flex: "none",
            gap: "2px",
          }}
        >
          <AdminNavLink href="/budget-settings/categories">
            {t("budgetSettings.layout.tabs.categories")}
          </AdminNavLink>
          <AdminNavLink href="/budget-settings/accounts">
            {t("budgetSettings.layout.tabs.accountsNetWorth")}
          </AdminNavLink>
          {canSee(Feature.repeating_transactions) && (
            <AdminNavLink href="/budget-settings/repeating">
              {t("budgetSettings.layout.tabs.repeatingTransactions")}
            </AdminNavLink>
          )}
          <AdminNavLink href="/budget-settings/payee-categorization">
            {t("budgetSettings.layout.tabs.payeeAutoCategorization")}
          </AdminNavLink>
          {canSee(Feature.audit_log) && (
            <AdminNavLink href="/budget-settings/audit-log">
              {t("budgetSettings.layout.tabs.auditLog")}
            </AdminNavLink>
          )}
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>{children}</Box>
      </Stack>
    </Box>
  );
}
