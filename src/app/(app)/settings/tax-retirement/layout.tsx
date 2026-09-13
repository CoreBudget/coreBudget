import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireUser } from "@/lib/auth/guards";
import AdminNavLink from "../../../admin/AdminNavLink";
import SectionMobileMenu from "../../../_shared/SectionMobileMenu";

export default async function TaxRetirementLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const t = await getTranslations();

  const tabs = [
    {
      href: "/settings/tax-retirement/accounts",
      label: t("settings.taxRetirement.layout.tabs.accounts"),
    },
    {
      href: "/settings/tax-retirement/filing",
      label: t("settings.taxRetirement.layout.tabs.filing"),
    },
    {
      href: "/settings/tax-retirement/withholding",
      label: t("settings.taxRetirement.layout.tabs.withholding"),
    },
    { href: "/settings/tax-retirement/goal", label: t("settings.taxRetirement.layout.tabs.goal") },
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
          {t("settings.taxRetirement.layout.title")}
        </Typography>
        <SectionMobileMenu tabs={tabs} />
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ gap: { xs: "12px", sm: "24px" }, alignItems: "flex-start" }}
      >
        <Stack
          component="nav"
          sx={{
            display: { xs: "none", sm: "flex" },
            width: 220,
            flex: "none",
            gap: "2px",
          }}
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
