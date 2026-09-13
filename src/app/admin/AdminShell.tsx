"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import HomeIcon from "@mui/icons-material/Home";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SettingsIcon from "@mui/icons-material/Settings";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import BackupIcon from "@mui/icons-material/Backup";
import DescriptionIcon from "@mui/icons-material/Description";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import AdminNavLink from "./AdminNavLink";
import SkipLink from "../_shared/SkipLink";
import ThemeToggle from "../_shared/ThemeToggle";
import BrandMark from "../_shared/BrandMark";
import NavIconLabel from "../_shared/NavIconLabel";

export default function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: ReactNode;
}) {
  const tokens = useTokens();
  const t = useTranslations();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SkipLink />
      <Stack
        direction="row"
        sx={{
          height: 56,
          flex: "none",
          alignItems: "center",
          gap: "20px",
          px: 3,
          borderBottom: `1px solid ${tokens.border}`,
        }}
        style={{ backgroundColor: tokens.topBarBackground }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            gap: 1,
            fontSize: 17,
            fontWeight: 700,
            color: "text.primary",
            whiteSpace: "nowrap",
          }}
        >
          <BrandMark size={30} />
          {t("admin.shell.brandName")}
          <Box
            component="span"
            sx={{
              fontSize: 11,
              fontWeight: 700,
              px: "8px",
              py: "2px",
              borderRadius: "5px",
              letterSpacing: "0.04em",
              ml: "2px",
              bgcolor: "primary.main",
              color: "black",
            }}
          >
            {t("admin.shell.adminBadge")}
          </Box>
        </Stack>

        <Box sx={{ flex: 1 }} />

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            color: tokens.textMuted,
            whiteSpace: "nowrap",
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
          {t("admin.shell.backToBudget")}
        </Link>
        <ThemeToggle />
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            bgcolor: "primary.main",
            color: "black",
          }}
        >
          {adminName.charAt(0).toUpperCase()}
        </Box>
      </Stack>

      <Stack direction="row" sx={{ flex: 1, overflow: "hidden" }}>
        <Stack
          component="nav"
          sx={{
            width: 220,
            flex: "none",
            gap: "2px",
            p: "16px 12px",
            borderRight: `1px solid ${tokens.border}`,
            overflowY: "auto",
          }}
        >
          <AdminNavLink href="/admin/users">
            <NavIconLabel icon={PeopleIcon} label={t("admin.shell.nav.users")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/households">
            <NavIconLabel icon={HomeIcon} label={t("admin.shell.nav.households")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/payees">
            <NavIconLabel icon={StorefrontIcon} label={t("admin.shell.nav.payees")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/settings">
            <NavIconLabel icon={SettingsIcon} label={t("admin.shell.nav.settings")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/features">
            <NavIconLabel icon={ToggleOnIcon} label={t("admin.shell.nav.features")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/health">
            <NavIconLabel icon={MonitorHeartIcon} label={t("admin.shell.nav.health")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/backups">
            <NavIconLabel icon={BackupIcon} label={t("admin.shell.nav.backups")} />
          </AdminNavLink>
          <AdminNavLink href="/admin/docs">
            <NavIconLabel icon={DescriptionIcon} label={t("admin.shell.nav.docs")} />
          </AdminNavLink>
        </Stack>

        <Box id="main-content" sx={{ flex: 1, overflowY: "auto" }}>
          <Box sx={{ px: 4, py: "28px", pb: "60px" }}>{children}</Box>
        </Box>
      </Stack>
    </Box>
  );
}
