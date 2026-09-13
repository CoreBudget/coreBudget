"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import AddIcon from "@mui/icons-material/Add";
import AdminButton from "../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import type { SidebarNetWorthItem } from "@/lib/workspace";
import AddAssetDialog from "./AddAssetDialog";
import AddLiabilityDialog from "./AddLiabilityDialog";
import { useTour } from "../../_shared/tours/useTour";
import {
  ASSET_TYPE_ICONS,
  LIABILITY_TYPE_ICONS,
  NET_WORTH_CATEGORY_ICONS,
} from "./netWorthTypeIcons";

export default function NetWorthListView({
  assetsVisible,
  canEditAssets,
  liabilitiesVisible,
  canEditLiabilities,
  locale,
  currencyCode,
  assets,
  liabilities,
}: {
  assetsVisible: boolean;
  canEditAssets: boolean;
  liabilitiesVisible: boolean;
  canEditLiabilities: boolean;
  locale: string | null;
  currencyCode: string;
  assets: SidebarNetWorthItem[];
  liabilities: SidebarNetWorthItem[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addLiabilityOpen, setAddLiabilityOpen] = useState(false);

  useTour("page:net-worth", [
    {
      element: '[data-tour="networth-add-buttons"]',
      title: t("netWorth.tour.addButtons.title"),
      description: t("netWorth.tour.addButtons.description"),
      side: "left",
    },
    {
      element: '[data-tour="networth-list"]',
      title: t("netWorth.tour.list.title"),
      description: t("netWorth.tour.list.description"),
      side: "top",
    },
  ]);

  function group(
    label: string,
    CategoryIcon: ComponentType<SvgIconProps>,
    typeIcons: Record<string, ComponentType<SvgIconProps>>,
    href: (id: string) => string,
    rows: SidebarNetWorthItem[],
    emptyLabel: string,
    positiveColor: string,
  ) {
    return (
      <Box sx={{ mb: "20px" }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", gap: "6px", mb: "8px" }}
          style={{ color: tokens.textFaint }}
        >
          <CategoryIcon sx={{ fontSize: 14 }} />
          <Typography sx={{ fontSize: 11.5, textTransform: "uppercase" }}>{label}</Typography>
        </Stack>
        {rows.length === 0 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textDisabled }}>
            {emptyLabel}
          </Typography>
        ) : (
          <Stack sx={{ gap: "8px" }}>
            {rows.map((row) => {
              const RowIcon = typeIcons[row.type];
              return (
                <Link key={row.id} href={href(row.id)} style={{ textDecoration: "none" }}>
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
                      {RowIcon && (
                        <RowIcon sx={{ fontSize: 18 }} style={{ color: tokens.textFaint }} />
                      )}
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        style={{ color: tokens.textBody }}
                      >
                        {row.name}
                      </Typography>
                    </Stack>
                    <Typography
                      sx={{ fontSize: 14, fontWeight: 600, flex: "none", ml: "8px" }}
                      style={{ color: positiveColor }}
                    >
                      {formatCurrency(row.value, locale, currencyCode)}
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
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: "18px",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
          style={{ color: tokens.textPrimary }}
        >
          {t("netWorth.listPage.title")}
        </Typography>
        {(canEditAssets || canEditLiabilities) && (
          <Stack direction="row" data-tour="networth-add-buttons" sx={{ gap: 1 }}>
            {canEditAssets && (
              <AdminButton variant="contained" onClick={() => setAddAssetOpen(true)}>
                <AddIcon sx={{ fontSize: 16, mr: "4px" }} />
                {t("netWorth.listPage.addAsset")}
              </AdminButton>
            )}
            {canEditLiabilities && (
              <AdminButton variant="contained" onClick={() => setAddLiabilityOpen(true)}>
                <AddIcon sx={{ fontSize: 16, mr: "4px" }} />
                {t("netWorth.listPage.addLiability")}
              </AdminButton>
            )}
          </Stack>
        )}
      </Stack>

      <Box data-tour="networth-list">
        {assetsVisible &&
          group(
            t("appShell.nav.assets"),
            NET_WORTH_CATEGORY_ICONS.assets,
            ASSET_TYPE_ICONS,
            (id) => `/net-worth/assets/${id}`,
            assets,
            t("appShell.nav.noAssetsYet"),
            tokens.cashPositive,
          )}
        {liabilitiesVisible &&
          group(
            t("appShell.nav.liabilities"),
            NET_WORTH_CATEGORY_ICONS.liabilities,
            LIABILITY_TYPE_ICONS,
            (id) => `/net-worth/liabilities/${id}`,
            liabilities,
            t("appShell.nav.noLiabilitiesYet"),
            tokens.creditNegative,
          )}
      </Box>

      {canEditAssets && (
        <AddAssetDialog open={addAssetOpen} onClose={() => setAddAssetOpen(false)} />
      )}
      {canEditLiabilities && (
        <AddLiabilityDialog open={addLiabilityOpen} onClose={() => setAddLiabilityOpen(false)} />
      )}
    </Box>
  );
}
