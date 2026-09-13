"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PieChartIcon from "@mui/icons-material/PieChart";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useTokens } from "@/theme";

export default function MobileTabBar({
  moreOpen,
  onToggleMore,
}: {
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const pathname = usePathname();

  const tabs = [
    { href: "/dashboard", label: t("appShell.nav.dashboard"), Icon: SpaceDashboardIcon },
    { href: "/accounts", label: t("appShell.nav.accounts"), Icon: AccountBalanceWalletIcon },
    { href: "/budget", label: t("appShell.nav.budget"), Icon: PieChartIcon },
  ];

  return (
    <Stack
      direction="row"
      data-tour="welcome-mobile-tabbar"
      sx={{ height: 64, flex: "none" }}
      style={{ backgroundColor: tokens.topBarBackground, borderTop: `1px solid ${tokens.border}` }}
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = !moreOpen && (pathname === href || pathname.startsWith(`${href}/`));
        const color = active ? tokens.blue : tokens.textFaint;
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
            }}
          >
            <Icon sx={{ fontSize: 20 }} style={{ color }} />
            <Typography sx={{ fontSize: 10, fontWeight: 600 }} style={{ color }}>
              {label}
            </Typography>
          </Link>
        );
      })}
      <Box
        component="button"
        data-tour="welcome-mobile-more"
        onClick={onToggleMore}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "3px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <MoreHorizIcon
          sx={{ fontSize: 20 }}
          style={{ color: moreOpen ? tokens.blue : tokens.textFaint }}
        />
        <Typography
          sx={{ fontSize: 10, fontWeight: 600 }}
          style={{ color: moreOpen ? tokens.blue : tokens.textFaint }}
        >
          {t("appShell.nav.more")}
        </Typography>
      </Box>
    </Stack>
  );
}
