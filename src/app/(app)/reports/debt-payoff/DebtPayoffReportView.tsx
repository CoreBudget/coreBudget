"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { LineChart } from "@mui/x-charts/LineChart";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { useIsMobile } from "../../useIsMobile";
import ReportHeader from "../ReportHeader";
import ReportCard from "../ReportCard";
import type { DebtPayoffData } from "../reportQueries";

export default function DebtPayoffReportView({
  data,
  locale,
  currencyCode,
}: {
  data: DebtPayoffData;
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.debtPayoff");
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const debtFreeLabel = data.debtFreeDate
    ? formatDateOnly(data.debtFreeDate, { year: "numeric", month: "long" })
    : t("noProjection");

  const projectionLabels = data.projectionMonths.map((iso) =>
    formatDateOnly(iso, { month: "short" }),
  );

  return (
    <Box>
      <ReportHeader title={t("title")} subtitle={t("subtitle")} />
      <ReportCard sx={{ mb: "16px" }}>
        <Typography sx={{ fontSize: 11, mb: "4px" }} style={{ color: tokens.textFaint }}>
          {t("debtFreeLabel")}
        </Typography>
        <Typography sx={{ fontSize: 20, fontWeight: 700 }} style={{ color: tokens.textBody }}>
          {debtFreeLabel}
        </Typography>
      </ReportCard>

      {data.projection.length > 0 && (
        <ReportCard sx={{ mb: "16px" }}>
          <Typography
            sx={{ fontSize: 13, fontWeight: 700, mb: "10px" }}
            style={{ color: tokens.textBody }}
          >
            {t("projectionTitle")}
          </Typography>
          <LineChart
            height={240}
            series={[
              {
                data: data.projection,
                label: t("projectionLegend"),
                color: tokens.red,
                area: true,
              },
            ]}
            xAxis={[{ scaleType: "point", data: projectionLabels }]}
            margin={{ left: isMobile ? 46 : 80, right: isMobile ? 8 : 20 }}
          />
        </ReportCard>
      )}

      <ReportCard>
        <Typography
          sx={{ fontSize: 13, fontWeight: 700, mb: "10px" }}
          style={{ color: tokens.textBody }}
        >
          {t("byLiabilityTitle")}
        </Typography>
        {data.debts.length === 0 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        ) : (
          <Stack sx={{ gap: "12px" }}>
            {data.debts.map((d) => (
              <Box key={d.liabilityId}>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: "4px" }}>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {d.name}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 11.5, fontWeight: 600 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money(d.balance)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: "4px" }}>
                  <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                    {Math.round(d.pctPaidOff * 100)}%
                  </Typography>
                  <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                    {d.payoffDate
                      ? formatDateOnly(d.payoffDate, { year: "numeric", month: "short" })
                      : t("payoffTbd")}
                  </Typography>
                </Stack>
                <Box
                  sx={{ height: 6, borderRadius: "3px" }}
                  style={{ backgroundColor: tokens.hoverBackgroundStrong }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      borderRadius: "3px",
                      width: `${Math.round(d.pctPaidOff * 100)}%`,
                    }}
                    style={{ backgroundColor: tokens.blue }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </ReportCard>
    </Box>
  );
}
