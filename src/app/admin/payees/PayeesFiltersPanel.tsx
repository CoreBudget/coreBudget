"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FilterListIcon from "@mui/icons-material/FilterList";
import AdminButton from "../_shared/AdminButton";
import ClickableText from "../../_shared/ClickableText";
import { useTokens } from "@/theme";

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export interface PayeeFilters {
  startingLetter: string | null;
  minTxnCount: string;
  lastUsedSince: string;
  minRuleCount: string;
}

export const EMPTY_PAYEE_FILTERS: PayeeFilters = {
  startingLetter: null,
  minTxnCount: "",
  lastUsedSince: "",
  minRuleCount: "",
};

function countActiveFilters(filters: PayeeFilters): number {
  return [
    filters.startingLetter,
    filters.minTxnCount,
    filters.lastUsedSince,
    filters.minRuleCount,
  ].filter((v) => v !== null && v !== "").length;
}

export default function PayeesFiltersPanel({
  filters,
  onChange,
}: {
  filters: PayeeFilters;
  onChange: (next: PayeeFilters) => void;
}) {
  const t = useTranslations("admin.payees.filters");
  const tokens = useTokens();
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <AdminButton onClick={() => setOpen((o) => !o)}>
          <FilterListIcon sx={{ fontSize: 16, mr: "4px" }} />
          {t("button")}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </AdminButton>

        {open && (
          <Box
            sx={{
              position: "absolute",
              top: 40,
              left: 0,
              width: 340,
              borderRadius: "10px",
              border: `1px solid ${tokens.borderStrong}`,
              boxShadow: tokens.menuShadow,
              p: "16px",
              zIndex: 30,
            }}
            style={{ backgroundColor: tokens.menuBackground }}
          >
            <Stack sx={{ gap: "14px" }}>
              <Box>
                <Typography
                  sx={{ fontSize: 11, fontWeight: 600, mb: "6px" }}
                  style={{ color: tokens.textFaint }}
                >
                  {t("startingLetterLabel")}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onChange({ ...filters, startingLetter: null })}
                    sx={{
                      px: "8px",
                      py: "3px",
                      borderRadius: "6px",
                      fontSize: 11.5,
                      cursor: "pointer",
                      margin: 0,
                      font: "inherit",
                    }}
                    style={{
                      backgroundColor:
                        filters.startingLetter === null ? tokens.blue : "transparent",
                      color:
                        filters.startingLetter === null ? tokens.blueContrast : tokens.textMuted,
                      border: `1px solid ${filters.startingLetter === null ? tokens.blue : tokens.border}`,
                    }}
                  >
                    {t("allLetters")}
                  </Box>
                  {LETTERS.map((letter) => {
                    const active = filters.startingLetter === letter;
                    return (
                      <Box
                        key={letter}
                        component="button"
                        type="button"
                        onClick={() =>
                          onChange({ ...filters, startingLetter: active ? null : letter })
                        }
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          fontSize: 11.5,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: 0,
                          padding: 0,
                          font: "inherit",
                        }}
                        style={{
                          backgroundColor: active ? tokens.blue : "transparent",
                          color: active ? tokens.blueContrast : tokens.textMuted,
                          border: `1px solid ${active ? tokens.blue : tokens.border}`,
                        }}
                      >
                        {letter}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <TextField
                label={t("minTxnCountLabel")}
                type="number"
                size="small"
                fullWidth
                value={filters.minTxnCount}
                onChange={(e) => onChange({ ...filters, minTxnCount: e.target.value })}
                slotProps={{ htmlInput: { min: 0 } }}
              />

              <TextField
                label={t("lastUsedSinceLabel")}
                type="date"
                size="small"
                fullWidth
                value={filters.lastUsedSince}
                onChange={(e) => onChange({ ...filters, lastUsedSince: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label={t("minRuleCountLabel")}
                type="number"
                size="small"
                fullWidth
                value={filters.minRuleCount}
                onChange={(e) => onChange({ ...filters, minRuleCount: e.target.value })}
                slotProps={{ htmlInput: { min: 0 } }}
              />

              {activeCount > 0 && (
                <ClickableText
                  onClick={() => onChange(EMPTY_PAYEE_FILTERS)}
                  sx={{ fontSize: 12, cursor: "pointer", textAlign: "center" }}
                  style={{ color: tokens.blue }}
                >
                  {t("clearAll")}
                </ClickableText>
              )}
            </Stack>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
