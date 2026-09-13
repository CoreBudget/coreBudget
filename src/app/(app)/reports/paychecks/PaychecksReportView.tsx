"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import ReportYearPicker from "../ReportYearPicker";
import ReportHeader from "../ReportHeader";
import ReportCard from "../ReportCard";
import type { PaycheckReportData } from "../reportQueries";

export default function PaychecksReportView({
  data,
  year,
  years,
  locale,
  currencyCode,
}: {
  data: PaycheckReportData;
  year: number;
  years: number[];
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.paychecks");
  const tokens = useTokens();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const ytdTiles: [string, number][] = [
    [t("grossLabel"), data.ytd.gross],
    [t("federalTaxLabel"), data.ytd.federalTax],
    [t("oasdiLabel"), data.ytd.oasdi],
    [t("medicareLabel"), data.ytd.medicare],
    [t("stateTaxLabel"), data.ytd.stateTax],
    [t("employerContributionsLabel"), data.ytd.employerContributions],
    [t("netPayLabel"), data.ytd.net],
  ];

  const total401k = data.ytd.employee401k + data.ytd.employer401k;
  const contribution401kTiles: [string, number][] = [
    [t("employee401kLabel"), data.ytd.employee401k],
    [t("employer401kLabel"), data.ytd.employer401k],
    [t("total401kLabel"), total401k],
  ];

  const monthFormatter = new Intl.DateTimeFormat(locale || "en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <Box>
      <ReportHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<ReportYearPicker years={years} selectedYear={year} />}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: "10px",
          mb: "20px",
        }}
      >
        {ytdTiles.map(([label, amount]) => (
          <ReportCard key={label}>
            <Typography sx={{ fontSize: 11, mb: "4px" }} style={{ color: tokens.textFaint }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }} style={{ color: tokens.textBody }}>
              {money(amount)}
            </Typography>
          </ReportCard>
        ))}
      </Box>

      <Typography
        sx={{ fontSize: 13, fontWeight: 700, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {t("contributions401kTitle")}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: "10px",
          mb: "20px",
        }}
      >
        {contribution401kTiles.map(([label, amount], i) => (
          <ReportCard key={label}>
            <Typography sx={{ fontSize: 11, mb: "4px" }} style={{ color: tokens.textFaint }}>
              {label}
            </Typography>
            <Typography
              sx={{ fontSize: 18, fontWeight: 700 }}
              style={{ color: i === 2 ? tokens.blue : tokens.textBody }}
            >
              {money(amount)}
            </Typography>
          </ReportCard>
        ))}
      </Box>

      {data.months.length === 0 ? (
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {t("empty")}
        </Typography>
      ) : (
        <Stack sx={{ gap: "10px" }}>
          {data.months.map((m) => (
            <ReportCard key={m.month}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center", mb: "8px" }}
              >
                <Typography
                  sx={{ fontSize: 13, fontWeight: 700 }}
                  style={{ color: tokens.textBody }}
                >
                  {monthFormatter.format(new Date(Date.UTC(year, m.month, 1)))}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700 }} style={{ color: tokens.green }}>
                  {money(m.net)}
                </Typography>
              </Stack>
              <Stack sx={{ gap: "4px" }}>
                {m.jobs.map((job) => (
                  <Stack key={job.jobId} direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                      {job.personName} · {job.jobName}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textBody }}>
                      {money(job.gross)} → {money(job.net)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </ReportCard>
          ))}
        </Stack>
      )}
    </Box>
  );
}
