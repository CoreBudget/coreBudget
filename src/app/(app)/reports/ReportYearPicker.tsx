"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

export default function ReportYearPicker({
  years,
  selectedYear,
}: {
  years: number[];
  selectedYear: number;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <TextField
      select
      size="small"
      value={selectedYear}
      aria-label={t("transactions.viewFilters.yearLabel")}
      onChange={(e) => router.push(`${pathname}?year=${e.target.value}`)}
      sx={{ width: 100, flex: "none" }}
    >
      {years.map((year) => (
        <MenuItem key={year} value={year}>
          {year}
        </MenuItem>
      ))}
    </TextField>
  );
}
