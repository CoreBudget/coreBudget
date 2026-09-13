import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireUser } from "@/lib/auth/guards";
import AdminNavLink from "../../../admin/AdminNavLink";
import SectionMobileMenu from "../../../_shared/SectionMobileMenu";
import LayoutTour from "../../../_shared/tours/LayoutTour";

export default async function UserSettingsLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const t = await getTranslations();

  const tabs = [
    { href: "/settings/profile", label: t("settings.layout.tabs.profile") },
    { href: "/settings/security", label: t("settings.layout.tabs.security") },
    { href: "/settings/localization", label: t("settings.layout.tabs.localization") },
    { href: "/settings/preferences", label: t("settings.layout.tabs.preferences") },
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
          {t("settings.layout.title")}
        </Typography>
        <SectionMobileMenu tabs={tabs} dataTour="settings-tabs-mobile" />
      </Stack>
      <LayoutTour
        tourId="page:settings"
        desktopSteps={[
          {
            element: '[data-tour="settings-tabs-desktop"]',
            title: t("settings.layout.tour.title"),
            description: t("settings.layout.tour.description"),
            side: "right",
          },
        ]}
        mobileSteps={[
          {
            element: '[data-tour="settings-tabs-mobile"]',
            title: t("settings.layout.tour.title"),
            description: t("settings.layout.tour.description"),
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
          data-tour="settings-tabs-desktop"
          sx={{
            display: { xs: "none", sm: "flex" },
            width: 220,
            flex: "none",
            gap: "2px",
          }}
        >
          <AdminNavLink href="/settings/profile">{t("settings.layout.tabs.profile")}</AdminNavLink>
          <AdminNavLink href="/settings/security">
            {t("settings.layout.tabs.security")}
          </AdminNavLink>
          <AdminNavLink href="/settings/localization">
            {t("settings.layout.tabs.localization")}
          </AdminNavLink>
          <AdminNavLink href="/settings/preferences">
            {t("settings.layout.tabs.preferences")}
          </AdminNavLink>
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>{children}</Box>
      </Stack>
    </Box>
  );
}
