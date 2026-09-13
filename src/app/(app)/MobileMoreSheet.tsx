"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { useTranslations } from "next-intl";
import CloseIcon from "@mui/icons-material/Close";
import { useTokens } from "@/theme";

export default function MobileMoreSheet({
  canSee,
  incomeCalculatorEnabled,
  onNavigate,
  onClose,
}: {
  canSee: (feature: string) => boolean;
  incomeCalculatorEnabled: boolean;
  onNavigate: () => void;
  onClose: () => void;
}) {
  const tokens = useTokens();
  const t = useTranslations();

  const links = [
    canSee("plan") && { href: "/plan", label: t("appShell.nav.plan") },
    (canSee("net_worth_assets") || canSee("net_worth_liabilities")) && {
      href: "/net-worth",
      label: t("appShell.nav.netWorthGroup"),
    },
    canSee("subscriptions") && { href: "/subscriptions", label: t("appShell.nav.subscriptions") },
    canSee("reports") && { href: "/reports", label: t("appShell.nav.reports") },
    incomeCalculatorEnabled && {
      href: "/income-calculator",
      label: t("appShell.nav.incomeCalculator"),
    },
    canSee("budget_settings") && {
      href: "/budget-settings",
      label: t("appShell.nav.budgetSettings"),
    },
  ].filter((link): link is { href: string; label: string } => Boolean(link));

  return (
    <Box
      sx={{ position: "absolute", inset: 0, zIndex: 15, p: "16px" }}
      style={{ backgroundColor: tokens.pageBackground }}
    >
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: "14px" }}
      >
        <Typography sx={{ fontSize: 17, fontWeight: 700 }} style={{ color: tokens.textPrimary }}>
          {t("appShell.moreSheet.title")}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={t("appShell.moreSheet.close")}>
          <CloseIcon sx={{ fontSize: 18 }} style={{ color: tokens.textSecondary }} />
        </IconButton>
      </Stack>
      <Stack>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            style={{
              padding: "14px 10px",
              borderBottom: `1px solid ${tokens.divider}`,
              fontSize: 15,
              color: tokens.textBody,
              textDecoration: "none",
            }}
          >
            {link.label}
          </Link>
        ))}
      </Stack>
    </Box>
  );
}
