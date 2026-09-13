import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import AdminNavLink from "../../admin/AdminNavLink";
import SectionMobileMenu from "../../_shared/SectionMobileMenu";
import LayoutTour from "../../_shared/tours/LayoutTour";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  await requireFeature(Feature.reports);
  const t = await getTranslations();

  const tabs = [
    { href: "/reports/income-expense", label: t("reports.layout.tabs.incomeExpense") },
    { href: "/reports/paychecks", label: t("reports.layout.tabs.paychecks") },
    { href: "/reports/net-worth", label: t("reports.layout.tabs.netWorth") },
    { href: "/reports/budget-vs-actual", label: t("reports.layout.tabs.budgetVsActual") },
    { href: "/reports/payee", label: t("reports.layout.tabs.payee") },
    { href: "/reports/goal-progress", label: t("reports.layout.tabs.goalProgress") },
    { href: "/reports/debt-payoff", label: t("reports.layout.tabs.debtPayoff") },
    { href: "/reports/cash-flow", label: t("reports.layout.tabs.cashFlow") },
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
          {t("reports.layout.title")}
        </Typography>
        <SectionMobileMenu tabs={tabs} dataTour="reports-tabs-mobile" />
      </Stack>
      <LayoutTour
        tourId="page:reports"
        desktopSteps={[
          {
            element: '[data-tour="reports-tabs-desktop"]',
            title: t("reports.layout.tour.title"),
            description: t("reports.layout.tour.description"),
            side: "right",
          },
        ]}
        mobileSteps={[
          {
            element: '[data-tour="reports-tabs-mobile"]',
            title: t("reports.layout.tour.title"),
            description: t("reports.layout.tour.description"),
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
          data-tour="reports-tabs-desktop"
          sx={{ display: { xs: "none", sm: "flex" }, width: 220, flex: "none", gap: "2px" }}
        >
          {tabs.map((tab) => (
            <AdminNavLink key={tab.href} href={tab.href}>
              {tab.label}
            </AdminNavLink>
          ))}
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>{children}</Box>
      </Stack>
    </Box>
  );
}
