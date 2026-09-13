"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import AdminButton from "../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useIsMobile } from "../../useIsMobile";
import {
  DATE_PRESETS,
  presetToRange,
  type DatePreset,
  type ViewPreference,
} from "./viewPreference";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function monthName(month: number, locale: string | null): string {
  return new Intl.DateTimeFormat(locale ?? "en-US", { month: "long" }).format(
    new Date(2000, month - 1, 1),
  );
}

export default function ViewFiltersPanel({
  preference,
  onChange,
  dataMinYear,
  dataMaxYear,
  locale,
}: {
  preference: ViewPreference;
  onChange: (next: ViewPreference) => void;
  dataMinYear: number;
  dataMaxYear: number;
  locale: string | null;
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const yearRangeStart = dataMinYear - 10;
  const yearRangeEnd = dataMaxYear + 10;
  const yearOptions = Array.from(
    { length: yearRangeEnd - yearRangeStart + 1 },
    (_, i) => yearRangeStart + i,
  );

  function applyPreset(preset: DatePreset) {
    const { from, to } = presetToRange(preset, new Date(), dataMinYear, dataMaxYear);
    onChange({ ...preference, datePreset: preset, from, to });
  }

  function setCustomBound(edge: "from" | "to", field: "month" | "year", value: number) {
    onChange({
      ...preference,
      datePreset: "custom",
      [edge]: { ...preference[edge], [field]: value },
    });
  }

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <AdminButton onClick={() => setOpen((o) => !o)}>
          <FilterListIcon sx={{ fontSize: 16, mr: "4px" }} />
          {t("transactions.toolbar.view")}
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
                    right: 0,
                    width: 620,
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
                {t("transactions.viewFilters.title")}
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

            <Typography
              sx={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, mb: "8px" }}
              style={{ color: tokens.textFaint }}
            >
              {t("transactions.viewFilters.dateRangeLabel")}
            </Typography>
            <Stack direction="row" sx={{ gap: "6px", mb: "14px", flexWrap: "wrap" }}>
              {DATE_PRESETS.filter((p) => p !== "custom").map((preset) => {
                const active = preference.datePreset === preset;
                return (
                  <Box
                    key={preset}
                    component="button"
                    onClick={() => applyPreset(preset)}
                    sx={{
                      border: "none",
                      borderRadius: "7px",
                      px: "12px",
                      py: "7px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                    style={{
                      backgroundColor: active ? tokens.blue : tokens.hoverBackground,
                      color: active ? tokens.blueContrast : tokens.textSecondary,
                    }}
                  >
                    {t(`transactions.viewFilters.presets.${preset}`)}
                  </Box>
                );
              })}
            </Stack>

            <Stack direction="row" sx={{ gap: "10px", mb: "14px", flexWrap: "wrap" }}>
              <Box sx={{ flex: isMobile ? "1 1 45%" : 1 }}>
                <Typography
                  sx={{ fontSize: 11, textTransform: "uppercase", mb: "4px" }}
                  style={{ color: tokens.textFaint }}
                >
                  {t("transactions.viewFilters.fromLabel")}
                </Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={preference.from.month}
                  aria-label={t("transactions.viewFilters.fromMonthLabel")}
                  onChange={(e) => setCustomBound("from", "month", Number(e.target.value))}
                  slotProps={{ select: { MenuProps: { disablePortal: true } } }}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {monthName(m, locale)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: isMobile ? "1 1 45%" : 1 }}>
                <Typography
                  sx={{ fontSize: 11, textTransform: "uppercase", mb: "4px" }}
                  style={{ color: tokens.textFaint }}
                >
                  {t("transactions.viewFilters.yearLabel")}
                </Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={preference.from.year}
                  aria-label={t("transactions.viewFilters.fromYearLabel")}
                  onChange={(e) => setCustomBound("from", "year", Number(e.target.value))}
                  slotProps={{ select: { MenuProps: { disablePortal: true } } }}
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: isMobile ? "1 1 45%" : 1 }}>
                <Typography
                  sx={{ fontSize: 11, textTransform: "uppercase", mb: "4px" }}
                  style={{ color: tokens.textFaint }}
                >
                  {t("transactions.viewFilters.toLabel")}
                </Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={preference.to.month}
                  aria-label={t("transactions.viewFilters.toMonthLabel")}
                  onChange={(e) => setCustomBound("to", "month", Number(e.target.value))}
                  slotProps={{ select: { MenuProps: { disablePortal: true } } }}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {monthName(m, locale)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: isMobile ? "1 1 45%" : 1 }}>
                <Typography
                  sx={{ fontSize: 11, textTransform: "uppercase", mb: "4px" }}
                  style={{ color: tokens.textFaint }}
                >
                  {t("transactions.viewFilters.yearLabel")}
                </Typography>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={preference.to.year}
                  aria-label={t("transactions.viewFilters.toYearLabel")}
                  onChange={(e) => setCustomBound("to", "year", Number(e.target.value))}
                  slotProps={{ select: { MenuProps: { disablePortal: true } } }}
                >
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Stack>

            <Box sx={{ borderBottom: `1px solid ${tokens.divider}`, mb: "14px" }} />

            <Typography
              sx={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600, mb: "6px" }}
              style={{ color: tokens.textFaint }}
            >
              {t("transactions.viewFilters.viewOptionsLabel")}
            </Typography>
            <Stack sx={{ gap: 0 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preference.showReconciled}
                    onChange={(e) => onChange({ ...preference, showReconciled: e.target.checked })}
                    size="small"
                    sx={{
                      color: tokens.green,
                      "&.Mui-checked": { color: tokens.green },
                    }}
                  />
                }
                label={t("transactions.viewFilters.showReconciled")}
                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13, color: tokens.textBody } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={preference.showRunningBalance}
                    onChange={(e) =>
                      onChange({ ...preference, showRunningBalance: e.target.checked })
                    }
                    size="small"
                    sx={{
                      color: tokens.green,
                      "&.Mui-checked": { color: tokens.green },
                    }}
                  />
                }
                label={t("transactions.viewFilters.showRunningBalance")}
                sx={{ "& .MuiFormControlLabel-label": { fontSize: 13, color: tokens.textBody } }}
              />
            </Stack>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
