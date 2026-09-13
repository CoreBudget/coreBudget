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
import type { PayeeReportData } from "../reportQueries";

export default function PayeeReportView({
  data,
  year,
  years,
  locale,
  currencyCode,
}: {
  data: PayeeReportData;
  year: number;
  years: number[];
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.payee");
  const tokens = useTokens();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const maxTotal = Math.max(1, ...data.payees.map((p) => Math.abs(p.total)));

  return (
    <Box>
      <ReportHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<ReportYearPicker years={years} selectedYear={year} />}
      />

      <ReportCard>
        {data.payees.length === 0 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        ) : (
          <Stack sx={{ gap: "12px" }}>
            {data.payees.map((p) => (
              <Box key={p.payeeId}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "baseline", mb: "4px" }}
                >
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {p.payeeName}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 600 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money(p.total)}{" "}
                    <Typography
                      component="span"
                      sx={{ fontSize: 11 }}
                      style={{ color: tokens.textFaint }}
                    >
                      {t("txnCount", { count: p.count })}
                    </Typography>
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
                      width: `${Math.min(100, (Math.abs(p.total) / maxTotal) * 100)}%`,
                    }}
                    style={{ backgroundColor: p.total >= 0 ? tokens.blue : tokens.green }}
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
