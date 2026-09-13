"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LineChart } from "@mui/x-charts/LineChart";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import { useIsMobile } from "../../useIsMobile";
import ReportYearPicker from "../ReportYearPicker";
import ReportHeader from "../ReportHeader";
import ReportCard from "../ReportCard";
import type { NetWorthReportData } from "../reportQueries";

export default function NetWorthReportView({
  data,
  year,
  years,
  locale,
  currencyCode,
}: {
  data: NetWorthReportData;
  year: number;
  years: number[];
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.netWorth");
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const monthLabels = data.months.map((m) =>
    new Intl.DateTimeFormat(locale || "en-US", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, m.month, 1)),
    ),
  );

  return (
    <Box>
      <ReportHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<ReportYearPicker years={years} selectedYear={year} />}
      />

      <ReportCard sx={{ mb: "16px" }}>
        <Typography sx={{ fontSize: 11, mb: "4px" }} style={{ color: tokens.textFaint }}>
          {t("changeLabel", { year })}
        </Typography>
        <Typography
          sx={{ fontSize: 20, fontWeight: 700 }}
          style={{ color: data.changeAmount >= 0 ? tokens.green : tokens.red }}
        >
          {data.changeAmount >= 0 ? "+" : ""}
          {money(data.changeAmount)}
        </Typography>
      </ReportCard>

      <ReportCard>
        {data.months.length < 2 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("notEnoughData")}
          </Typography>
        ) : (
          <LineChart
            height={260}
            series={[
              {
                data: data.months.map((m) => m.netWorth),
                label: t("chartLabel"),
                color: tokens.blue,
                showMark: data.months.length <= 24,
                area: true,
              },
            ]}
            xAxis={[{ scaleType: "point", data: monthLabels }]}
            margin={{ left: isMobile ? 46 : 80, right: isMobile ? 8 : 20 }}
          />
        )}
      </ReportCard>
    </Box>
  );
}
