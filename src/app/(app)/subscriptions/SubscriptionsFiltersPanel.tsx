"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import AdminButton from "../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useIsMobile } from "../useIsMobile";
import type { SubscriptionRow } from "./SubscriptionsPanel";

export interface SubscriptionFilters {
  status: "all" | "active" | "paused" | "canceled";
  cadence: "all" | "monthly" | "quarterly" | "yearly" | "every_n_weeks";
  categoryId: "all" | string;
  accountId: "all" | string;
  autoRenew: "all" | "on" | "off";
}

export const DEFAULT_SUBSCRIPTION_FILTERS: SubscriptionFilters = {
  status: "all",
  cadence: "all",
  categoryId: "all",
  accountId: "all",
  autoRenew: "all",
};

export function isSubscriptionFiltersActive(filters: SubscriptionFilters): boolean {
  return Object.values(filters).some((v) => v !== "all");
}

export function subscriptionMatchesFilters(
  s: SubscriptionRow,
  filters: SubscriptionFilters,
): boolean {
  if (filters.status !== "all" && s.status !== filters.status) return false;
  if (filters.cadence !== "all" && s.cadence !== filters.cadence) return false;
  if (filters.categoryId !== "all" && (s.categoryId ?? "") !== filters.categoryId) return false;
  if (filters.accountId !== "all" && s.accountId !== filters.accountId) return false;
  if (filters.autoRenew !== "all" && s.autoRenew !== (filters.autoRenew === "on")) return false;
  return true;
}

interface Option {
  value: string;
  label: string;
}

export default function SubscriptionsFiltersPanel({
  filters,
  onChange,
  categoryOptions,
  accountOptions,
}: {
  filters: SubscriptionFilters;
  onChange: (next: SubscriptionFilters) => void;
  categoryOptions: { id: string; name: string }[];
  accountOptions: { id: string; name: string }[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const active = isSubscriptionFiltersActive(filters);

  function field(label: string, key: keyof SubscriptionFilters, options: Option[], value: string) {
    return (
      <Box sx={{ flex: isMobile ? "1 1 45%" : "1 1 170px" }}>
        <Typography
          sx={{ fontSize: 11, textTransform: "uppercase", mb: "4px" }}
          style={{ color: tokens.textFaint }}
        >
          {label}
        </Typography>
        <TextField
          select
          size="small"
          fullWidth
          value={value}
          aria-label={label}
          onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
          slotProps={{ select: { MenuProps: { disablePortal: true } } }}
        >
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  const allLabel = t("subscriptions.filters.all");

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <AdminButton
          onClick={() => setOpen((o) => !o)}
          style={active ? { color: tokens.blue, borderColor: tokens.blue } : undefined}
        >
          <FilterListIcon sx={{ fontSize: 16, mr: "4px" }} />
          {t("subscriptions.filters.title")}
        </AdminButton>

        {open && (
          <Box
            sx={
              isMobile
                ? {
                    position: "fixed",
                    left: "14px",
                    right: "14px",
                    bottom: "76px",
                    maxHeight: "70vh",
                    overflowY: "auto",
                    borderRadius: "10px",
                    border: `1px solid ${tokens.borderStrong}`,
                    boxShadow: tokens.menuShadow,
                    p: "16px",
                    zIndex: 30,
                  }
                : {
                    position: "absolute",
                    top: 40,
                    left: 0,
                    width: 440,
                    borderRadius: "10px",
                    border: `1px solid ${tokens.borderStrong}`,
                    boxShadow: tokens.menuShadow,
                    p: "16px",
                    zIndex: 30,
                  }
            }
            style={{ backgroundColor: tokens.menuBackground }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between", mb: "12px" }}
            >
              <Typography sx={{ fontSize: 15, fontWeight: 700 }} style={{ color: tokens.textBody }}>
                {t("subscriptions.filters.title")}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                sx={{ m: "-6px" }}
              >
                <CloseIcon sx={{ fontSize: 18 }} style={{ color: tokens.textFaint }} />
              </IconButton>
            </Stack>
            <Box sx={{ borderBottom: `1px solid ${tokens.divider}`, mb: "14px" }} />

            <Stack direction="row" sx={{ gap: "10px", flexWrap: "wrap", mb: active ? "14px" : 0 }}>
              {field(
                t("subscriptions.filters.status"),
                "status",
                [
                  { value: "all", label: allLabel },
                  { value: "active", label: t("subscriptions.statuses.active") },
                  { value: "paused", label: t("subscriptions.statuses.paused") },
                  { value: "canceled", label: t("subscriptions.statuses.canceled") },
                ],
                filters.status,
              )}
              {field(
                t("subscriptions.filters.cadence"),
                "cadence",
                [
                  { value: "all", label: allLabel },
                  { value: "monthly", label: t("subscriptions.cadences.monthly") },
                  { value: "quarterly", label: t("subscriptions.cadences.quarterly") },
                  { value: "yearly", label: t("subscriptions.cadences.yearly") },
                  { value: "every_n_weeks", label: t("subscriptions.cadences.every_n_weeks") },
                ],
                filters.cadence,
              )}
              {field(
                t("subscriptions.filters.category"),
                "categoryId",
                [
                  { value: "all", label: allLabel },
                  ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
                ],
                filters.categoryId,
              )}
              {field(
                t("subscriptions.filters.account"),
                "accountId",
                [
                  { value: "all", label: allLabel },
                  ...accountOptions.map((a) => ({ value: a.id, label: a.name })),
                ],
                filters.accountId,
              )}
              {field(
                t("subscriptions.filters.autoRenew"),
                "autoRenew",
                [
                  { value: "all", label: allLabel },
                  { value: "on", label: t("subscriptions.filters.autoRenewOn") },
                  { value: "off", label: t("subscriptions.filters.autoRenewOff") },
                ],
                filters.autoRenew,
              )}
            </Stack>

            {active && (
              <AdminButton onClick={() => onChange(DEFAULT_SUBSCRIPTION_FILTERS)}>
                {t("subscriptions.filters.clear")}
              </AdminButton>
            )}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
