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
import type { CashFlowData } from "../reportQueries";

export default function CashFlowReportView({
  data,
  year,
  years,
  locale,
  currencyCode,
}: {
  data: CashFlowData;
  year: number;
  years: number[];
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.cashFlow");
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const monthLabels = data.months.map((m) =>
    new Intl.DateTimeFormat(locale || "en-US", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, m.month, 1)),
    ),
  );
  const hasData = data.months.some((m) => m.net !== 0);

  return (
    <Box>
      <ReportHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<ReportYearPicker years={years} selectedYear={year} />}
      />

      <ReportCard sx={{ mb: "16px" }}>
        <Typography sx={{ fontSize: 11, mb: "4px" }} style={{ color: tokens.textFaint }}>
          {t("netLabel", { year })}
        </Typography>
        <Typography
          sx={{ fontSize: 20, fontWeight: 700 }}
          style={{ color: data.yearTotal >= 0 ? tokens.green : tokens.red }}
        >
          {data.yearTotal >= 0 ? "+" : ""}
          {money(data.yearTotal)}
        </Typography>
      </ReportCard>

      <ReportCard>
        {!hasData ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        ) : (
          <LineChart
            height={260}
            series={[
              {
                data: data.months.map((m) => m.net),
                label: t("chartLabel"),
                color: data.yearTotal >= 0 ? tokens.green : tokens.red,
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
