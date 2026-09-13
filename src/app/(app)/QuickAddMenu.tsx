"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import AddIcon from "@mui/icons-material/Add";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PaymentIcon from "@mui/icons-material/Payment";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import AddAccountDialog from "./accounts/AddAccountDialog";
import AddAssetDialog from "./net-worth/AddAssetDialog";
import AddLiabilityDialog from "./net-worth/AddLiabilityDialog";
import AddPaycheckDialog from "./income-calculator/AddPaycheckDialog";
import {
  getQuickAddPaycheckContextAction,
  type QuickAddPaycheckContext,
} from "./income-calculator/actions";

type ItemKey = "account" | "asset" | "liability" | "paycheck";

export default function QuickAddMenu() {
  const tokens = useTokens();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addLiabilityOpen, setAddLiabilityOpen] = useState(false);
  const [addPaycheckOpen, setAddPaycheckOpen] = useState(false);
  const [paycheckContext, setPaycheckContext] = useState<QuickAddPaycheckContext | null>(null);
  const [paycheckContextLoading, setPaycheckContextLoading] = useState(false);

  const ITEMS: { key: ItemKey; label: string; Icon: ComponentType<SvgIconProps> }[] = [
    { key: "account", label: t("appShell.quickAddMenu.addAccount"), Icon: AddIcon },
    { key: "asset", label: t("appShell.quickAddMenu.addAsset"), Icon: TrendingUpIcon },
    { key: "liability", label: t("appShell.quickAddMenu.addLiability"), Icon: AccountBalanceIcon },
    { key: "paycheck", label: t("appShell.quickAddMenu.addPaycheck"), Icon: PaymentIcon },
  ];

  function handleSelect(key: ItemKey) {
    setOpen(false);
    if (key === "account") {
      setAddAccountOpen(true);
      return;
    }
    if (key === "asset") {
      setAddAssetOpen(true);
      return;
    }
    if (key === "liability") {
      setAddLiabilityOpen(true);
      return;
    }
    setAddPaycheckOpen(true);
    setPaycheckContextLoading(true);
    getQuickAddPaycheckContextAction().then((data) => {
      setPaycheckContext(data);
      setPaycheckContextLoading(false);
    });
  }

  return (
    <>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setOpen((o) => !o)}
            size="small"
            aria-label={t("appShell.quickAddMenu.ariaLabel")}
            sx={{ color: "text.secondary" }}
          >
            <AddIcon fontSize="small" />
          </IconButton>

          {open && (
            <Box
              sx={{
                position: "absolute",
                top: 44,
                right: 0,
                width: 170,
                borderRadius: "10px",
                border: `1px solid ${tokens.borderStrong}`,
                boxShadow: tokens.menuShadow,
                p: "6px",
                zIndex: 30,
              }}
              style={{ backgroundColor: tokens.menuBackground }}
            >
              {ITEMS.map(({ key, label, Icon }) => (
                <Box
                  key={key}
                  component="button"
                  type="button"
                  onClick={() => handleSelect(key)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    border: "none",
                    background: "none",
                    margin: 0,
                    font: "inherit",
                    textAlign: "left",
                    px: "10px",
                    py: "9px",
                    borderRadius: "6px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  style={{ color: tokens.textBody }}
                >
                  <Icon sx={{ fontSize: 17 }} style={{ color: tokens.textMuted }} />
                  {label}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </ClickAwayListener>

      <AddAccountDialog open={addAccountOpen} onClose={() => setAddAccountOpen(false)} />
      <AddAssetDialog open={addAssetOpen} onClose={() => setAddAssetOpen(false)} />
      <AddLiabilityDialog open={addLiabilityOpen} onClose={() => setAddLiabilityOpen(false)} />
      <AddPaycheckDialog
        open={addPaycheckOpen}
        onClose={() => setAddPaycheckOpen(false)}
        context={paycheckContext}
        loading={paycheckContextLoading}
      />
    </>
  );
}
