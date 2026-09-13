"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import { formatYearMonth } from "@/lib/month";
import { useIsMobile } from "../../useIsMobile";
import ReportYearPicker from "../ReportYearPicker";
import ReportHeader from "../ReportHeader";
import ReportCard from "../ReportCard";
import type { BudgetVsActualData } from "../reportQueries";

export default function BudgetVsActualReportView({
  data,
  year,
  years,
  locale,
  currencyCode,
}: {
  data: BudgetVsActualData;
  year: number;
  years: number[];
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.budgetVsActual");
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const monthLabels = data.months.map((m) =>
    new Intl.DateTimeFormat(locale || "en-US", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, m.month, 1)),
    ),
  );
  const hasData = data.months.some((m) => m.planned !== 0 || m.actual !== 0);

  return (
    <Box>
      <ReportHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<ReportYearPicker years={years} selectedYear={year} />}
      />

      <ReportCard sx={{ mb: "16px" }}>
        {!hasData ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        ) : (
          <BarChart
            height={260}
            series={[
              {
                data: data.months.map((m) => m.planned),
                label: t("plannedLegend"),
                color: tokens.textFaint,
              },
              {
                data: data.months.map((m) => m.actual),
                label: t("actualLegend"),
                color: tokens.blue,
              },
            ]}
            xAxis={[{ scaleType: "band", data: monthLabels }]}
            margin={{ left: isMobile ? 46 : 80, right: isMobile ? 8 : 20 }}
          />
        )}
      </ReportCard>

      {data.latestMonth && (
        <ReportCard>
          <Typography
            sx={{ fontSize: 13, fontWeight: 700, mb: "10px" }}
            style={{ color: tokens.textBody }}
          >
            {t("bySectionTitle", { month: formatYearMonth(data.latestMonth, locale) })}
          </Typography>
          <Stack sx={{ gap: "8px" }}>
            {data.sectionBreakdown.map((s) => {
              const over = s.actual > s.planned;
              return (
                <Stack
                  key={s.sectionId}
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                    {s.sectionName}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 600 }}
                    style={{ color: over ? tokens.red : tokens.green }}
                  >
                    {money(s.actual)} / {money(s.planned)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </ReportCard>
      )}
    </Box>
  );
}
