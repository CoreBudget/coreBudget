"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import SettingsIcon from "@mui/icons-material/Settings";
import SavingsIcon from "@mui/icons-material/Savings";
import ScheduleIcon from "@mui/icons-material/Schedule";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { logout } from "./actions";

export default function AvatarMenu({
  userName,
  userEmail,
  isAdmin,
}: {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const items: { label: string; href: string; icon: ComponentType<SvgIconProps> }[] = [
    { label: t("appShell.avatarMenu.userSettings"), href: "/settings", icon: SettingsIcon },
    {
      label: t("appShell.avatarMenu.taxRetirement"),
      href: "/settings/tax-retirement",
      icon: SavingsIcon,
    },
    { label: t("appShell.avatarMenu.jobs"), href: "/settings/jobs", icon: ScheduleIcon },
    {
      label: t("appShell.avatarMenu.apiTokens"),
      href: "/settings/api-tokens",
      icon: VpnKeyIcon,
    },
    {
      label: t("appShell.avatarMenu.notificationSettings"),
      href: "/settings/notifications",
      icon: NotificationsIcon,
    },
  ];

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <Box
          component="button"
          onClick={() => setOpen((o) => !o)}
          sx={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          {userName.charAt(0).toUpperCase()}
        </Box>

        {open && (
          <Box
            sx={{
              position: "absolute",
              top: 42,
              right: 0,
              width: 230,
              borderRadius: "10px",
              border: `1px solid ${tokens.borderStrong}`,
              boxShadow: tokens.menuShadow,
              p: "6px",
              zIndex: 30,
            }}
            style={{ backgroundColor: tokens.menuBackground }}
          >
            <Box sx={{ p: "10px 12px", mb: "4px", borderBottom: `1px solid ${tokens.divider}` }}>
              <Typography
                sx={{ fontSize: 13.5, fontWeight: 500 }}
                style={{ color: tokens.textBody }}
              >
                {userName}
              </Typography>
              <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textMuted }}>
                {userEmail}
              </Typography>
            </Box>

            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  textDecoration: "none",
                  color: tokens.textSecondary,
                }}
              >
                <item.icon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
                {item.label}
              </Link>
            ))}

            {isAdmin && (
              <>
                <Box
                  sx={{ height: "1px", my: "4px" }}
                  style={{ backgroundColor: tokens.divider }}
                />
                <Link
                  href="/admin/users"
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  <AdminPanelSettingsIcon sx={{ fontSize: 16 }} style={{ color: tokens.amber }} />
                  <span style={{ color: tokens.amber }}>
                    {t("appShell.avatarMenu.adminDashboard")}
                  </span>
                </Link>
              </>
            )}

            <Box sx={{ height: "1px", my: "4px" }} style={{ backgroundColor: tokens.divider }} />
            <Box component="form" action={logout}>
              <Box
                component="button"
                type="submit"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: 13,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                style={{ color: tokens.red }}
              >
                <LogoutIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
                {t("appShell.avatarMenu.logOut")}
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
