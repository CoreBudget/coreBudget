"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import ReportYearPicker from "../ReportYearPicker";
import ReportHeader from "../ReportHeader";
import ReportCard from "../ReportCard";
import type { IncomeExpenseReportData, ReportCategoryMonthlyRow } from "../reportQueries";

const GRID_COLS = "minmax(140px, 1.6fr) repeat(12, 1fr) 1fr 1fr";

function groupBySection(
  rows: ReportCategoryMonthlyRow[],
): { sectionName: string; rows: ReportCategoryMonthlyRow[] }[] {
  const groups: { sectionName: string; rows: ReportCategoryMonthlyRow[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.sectionName === row.sectionName) last.rows.push(row);
    else groups.push({ sectionName: row.sectionName, rows: [row] });
  }
  return groups;
}

export default function IncomeExpenseReportView({
  data,
  year,
  years,
  locale,
  currencyCode,
}: {
  data: IncomeExpenseReportData;
  year: number;
  years: number[];
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.incomeExpense");
  const tokens = useTokens();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const monthLabels = Array.from({ length: 12 }, (_, m) =>
    new Intl.DateTimeFormat(locale || "en-US", { month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2000, m, 1)),
    ),
  );

  function table(rows: ReportCategoryMonthlyRow[], title: string, isIncome: boolean) {
    const totalsByMonth = Array.from({ length: 12 }, (_, m) =>
      rows.reduce((sum, r) => sum + r.monthly[m], 0),
    );
    const grandTotal = totalsByMonth.reduce((a, b) => a + b, 0);
    const avg = grandTotal / 12;
    const amountColor = isIncome ? tokens.green : tokens.red;
    const groups = groupBySection(rows);

    return (
      <ReportCard sx={{ mb: "16px" }}>
        <Typography
          sx={{ fontSize: 13.5, fontWeight: 700, mb: "10px" }}
          style={{ color: tokens.textBody }}
        >
          {title}
        </Typography>
        {rows.length === 0 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Box
              sx={{ display: "grid", gridTemplateColumns: GRID_COLS, minWidth: 700, width: "100%" }}
            >
              <Box sx={{ p: "6px 8px" }} />
              {monthLabels.map((label) => (
                <Typography
                  key={label}
                  sx={{ fontSize: 11, fontWeight: 600, p: "6px 4px", textAlign: "right" }}
                  style={{ color: tokens.textFaint }}
                >
                  {label}
                </Typography>
              ))}
              <Typography
                sx={{ fontSize: 11, fontWeight: 600, p: "6px 8px", textAlign: "right" }}
                style={{ color: tokens.textFaint }}
              >
                {t("totalColumn")}
              </Typography>
              <Typography
                sx={{ fontSize: 11, fontWeight: 600, p: "6px 8px", textAlign: "right" }}
                style={{ color: tokens.textFaint }}
              >
                {t("avgColumn")}
              </Typography>

              {groups.map((group) => (
                <Box key={group.sectionName} sx={{ display: "contents" }}>
                  <Box
                    sx={{
                      gridColumn: "1 / -1",
                      p: "8px",
                      borderTop: `1px solid ${tokens.borderStrong}`,
                    }}
                    style={{ backgroundColor: tokens.hoverBackgroundStrong }}
                  >
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 700 }}
                      style={{ color: tokens.textBody }}
                    >
                      {group.sectionName}
                    </Typography>
                  </Box>

                  {group.rows.map((row) => (
                    <Box key={row.id} sx={{ display: "contents" }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          p: "6px 8px 6px 16px",
                          borderTop: `1px solid ${tokens.divider}`,
                        }}
                        style={{ color: tokens.textBody }}
                      >
                        {row.name}
                      </Typography>
                      {row.monthly.map((amount, m) => (
                        <Typography
                          key={m}
                          sx={{
                            fontSize: 11.5,
                            p: "6px 4px",
                            textAlign: "right",
                            borderTop: `1px solid ${tokens.divider}`,
                          }}
                          style={{ color: amount === 0 ? tokens.textFaint : amountColor }}
                        >
                          {amount === 0 ? "–" : money(amount)}
                        </Typography>
                      ))}
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          p: "6px 8px",
                          textAlign: "right",
                          borderTop: `1px solid ${tokens.divider}`,
                        }}
                        style={{ color: amountColor }}
                      >
                        {money(row.total)}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 11.5,
                          p: "6px 8px",
                          textAlign: "right",
                          borderTop: `1px solid ${tokens.divider}`,
                        }}
                        style={{ color: tokens.textFaint }}
                      >
                        {money(row.total / 12)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}

              <Box sx={{ display: "contents" }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    p: "8px",
                    borderTop: `1px solid ${tokens.borderStrong}`,
                  }}
                  style={{ color: tokens.textBody }}
                >
                  {title}
                </Typography>
                {totalsByMonth.map((amount, m) => (
                  <Typography
                    key={m}
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      p: "8px 4px",
                      textAlign: "right",
                      borderTop: `1px solid ${tokens.borderStrong}`,
                    }}
                    style={{ color: amountColor }}
                  >
                    {money(amount)}
                  </Typography>
                ))}
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    p: "8px",
                    textAlign: "right",
                    borderTop: `1px solid ${tokens.borderStrong}`,
                  }}
                  style={{ color: amountColor }}
                >
                  {money(grandTotal)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    p: "8px",
                    textAlign: "right",
                    borderTop: `1px solid ${tokens.borderStrong}`,
                  }}
                  style={{ color: tokens.textBody }}
                >
                  {money(avg)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </ReportCard>
    );
  }

  return (
    <Box>
      <ReportHeader
        title={t("title")}
        subtitle={t("subtitle")}
        rightSlot={<ReportYearPicker years={years} selectedYear={year} />}
      />
      {table(data.income, t("incomeTitle"), true)}
      {table(data.expense, t("expenseTitle"), false)}
    </Box>
  );
}
