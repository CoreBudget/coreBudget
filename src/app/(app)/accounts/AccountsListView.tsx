"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import AdminButton from "../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import { ACCOUNT_TYPE_ICONS } from "../accountTypes";
import type { SidebarAccount } from "@/lib/workspace";
import AddAccountDialog from "./AddAccountDialog";
import { useTour } from "../../_shared/tours/useTour";

export default function AccountsListView({
  locale,
  currencyCode,
  cash,
  credit,
}: {
  locale: string | null;
  currencyCode: string;
  cash: SidebarAccount[];
  credit: SidebarAccount[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const [addOpen, setAddOpen] = useState(false);

  useTour("page:accounts", [
    {
      element: '[data-tour="accounts-add-button"]',
      title: t("accounts.tour.addButton.title"),
      description: t("accounts.tour.addButton.description"),
      side: "left",
    },
    {
      element: '[data-tour="accounts-list"]',
      title: t("accounts.tour.list.title"),
      description: t("accounts.tour.list.description"),
      side: "top",
    },
  ]);

  function group(label: string, accounts: SidebarAccount[], emptyLabel: string) {
    return (
      <Box sx={{ mb: "20px" }}>
        <Typography
          sx={{ fontSize: 11.5, textTransform: "uppercase", mb: "8px" }}
          style={{ color: tokens.textFaint }}
        >
          {label}
        </Typography>
        {accounts.length === 0 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textDisabled }}>
            {emptyLabel}
          </Typography>
        ) : (
          <Stack sx={{ gap: "8px" }}>
            {accounts.map((a) => {
              const Icon = ACCOUNT_TYPE_ICONS[a.type];
              const negative = Number(a.balance) < 0;
              return (
                <Link key={a.id} href={`/accounts/${a.id}`} style={{ textDecoration: "none" }}>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: "13px 14px",
                      borderRadius: "10px",
                    }}
                    style={{
                      backgroundColor: tokens.cardBackground,
                      border: `1px solid ${tokens.border}`,
                    }}
                  >
                    <Stack direction="row" sx={{ alignItems: "center", gap: "10px", minWidth: 0 }}>
                      {Icon && <Icon sx={{ fontSize: 18 }} style={{ color: tokens.textFaint }} />}
                      <Typography
                        sx={{ fontSize: 14, fontWeight: 500 }}
                        style={{ color: tokens.textBody }}
                      >
                        {a.name}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{ fontSize: 14, fontWeight: 600, flex: "none" }}
                      style={{ color: negative ? tokens.red : tokens.green }}
                    >
                      {formatCurrency(a.balance, locale, currencyCode)}
                    </Typography>
                  </Stack>
                </Link>
              );
            })}
          </Stack>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: "20px 26px" }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: "18px" }}
      >
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
          style={{ color: tokens.textPrimary }}
        >
          {t("accounts.listPage.title")}
        </Typography>
        <Box data-tour="accounts-add-button">
          <AdminButton variant="contained" onClick={() => setAddOpen(true)}>
            <AddIcon sx={{ fontSize: 16, mr: "4px" }} />
            {t("accounts.listPage.addAccount")}
          </AdminButton>
        </Box>
      </Stack>

      <Box data-tour="accounts-list">
        {group(t("appShell.nav.cash"), cash, t("appShell.nav.noCashAccounts"))}
        {group(t("appShell.nav.credit"), credit, t("appShell.nav.noCreditAccounts"))}
      </Box>

      <AddAccountDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  );
}
