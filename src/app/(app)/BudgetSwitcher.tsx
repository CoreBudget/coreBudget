"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import type { AccessibleHousehold } from "@/lib/workspace";
import { selectBudgetAction } from "./actions";
import AddBudgetDialog from "./AddBudgetDialog";

export default function BudgetSwitcher({
  households,
  currentHouseholdName,
  currentBudgetName,
  variant = "sidebar",
}: {
  households: AccessibleHousehold[];
  currentHouseholdName: string;
  currentBudgetName: string;
  variant?: "sidebar" | "topbar";
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [addBudgetHouseholdId, setAddBudgetHouseholdId] = useState<string | null>(null);
  const isTopbar = variant === "topbar";

  function selectBudget(budgetId: string) {
    setOpen(false);
    startTransition(async () => {
      await selectBudgetAction(budgetId);
      router.refresh();
    });
  }

  return (
    <>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box sx={{ position: "relative", mb: isTopbar ? 0 : "14px" }}>
          <Box
            component="button"
            onClick={() => setOpen((o) => !o)}
            sx={
              isTopbar
                ? {
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    p: "4px 0",
                    cursor: "pointer",
                  }
                : {
                    width: "100%",
                    textAlign: "left",
                    border: `1px solid ${tokens.borderStrong}`,
                    borderRadius: "8px",
                    p: "10px 12px",
                    cursor: "pointer",
                  }
            }
            style={isTopbar ? undefined : { backgroundColor: tokens.menuBackground }}
          >
            <Typography
              sx={{
                fontSize: isTopbar ? 9.5 : 10.5,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
              style={{ color: tokens.textMuted }}
            >
              {currentHouseholdName}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: isTopbar ? "4px" : 0,
                justifyContent: isTopbar ? "flex-start" : "space-between",
                mt: "2px",
              }}
            >
              <Typography
                sx={{ fontSize: 13.5, fontWeight: isTopbar ? 600 : 500 }}
                style={{ color: tokens.textBody }}
              >
                {currentBudgetName}
              </Typography>
              <ExpandMoreIcon sx={{ fontSize: 16 }} style={{ color: tokens.textMuted }} />
            </Box>
          </Box>

          {open && (
            <Box
              sx={
                isTopbar
                  ? {
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      mt: "4px",
                      width: 230,
                      borderRadius: "10px",
                      border: `1px solid ${tokens.borderStrong}`,
                      boxShadow: tokens.menuShadow,
                      p: "6px",
                      zIndex: 30,
                    }
                  : {
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      mt: "4px",
                      borderRadius: "10px",
                      border: `1px solid ${tokens.borderStrong}`,
                      boxShadow: tokens.menuShadow,
                      p: "6px",
                      zIndex: 30,
                    }
              }
              style={{ backgroundColor: tokens.menuBackground }}
            >
              {households.map((h) => (
                <Box key={h.id} sx={{ mb: "4px" }}>
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      px: "10px",
                      py: "4px",
                    }}
                    style={{ color: tokens.textMuted }}
                  >
                    {h.name}
                  </Typography>
                  {h.budgets.length === 0 && (
                    <Typography
                      sx={{ fontSize: 12.5, px: "10px", py: "6px" }}
                      style={{ color: tokens.textDisabled }}
                    >
                      {t("appShell.budgetSwitcher.noBudgetsYet")}
                    </Typography>
                  )}
                  {h.budgets.map((b) => (
                    <Box
                      key={b.id}
                      component="button"
                      type="button"
                      onClick={() => selectBudget(b.id)}
                      sx={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "none",
                        margin: 0,
                        font: "inherit",
                        px: "10px",
                        py: "9px",
                        borderRadius: "6px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                      style={{
                        color: b.name === currentBudgetName ? tokens.blue : tokens.textBody,
                        backgroundColor:
                          b.name === currentBudgetName ? `${tokens.blue}1f` : "transparent",
                      }}
                    >
                      {b.name}
                    </Box>
                  ))}
                  {h.isOwner && (
                    <Box
                      component="button"
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setAddBudgetHouseholdId(h.id);
                      }}
                      sx={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        margin: 0,
                        font: "inherit",
                        background: "none",
                        px: "10px",
                        py: "9px",
                        borderRadius: "6px",
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      style={{ color: tokens.blue }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                      {t("appShell.budgetSwitcher.addBudget")}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </ClickAwayListener>
      <AddBudgetDialog
        open={addBudgetHouseholdId !== null}
        householdId={addBudgetHouseholdId ?? ""}
        onClose={() => setAddBudgetHouseholdId(null)}
      />
    </>
  );
}
