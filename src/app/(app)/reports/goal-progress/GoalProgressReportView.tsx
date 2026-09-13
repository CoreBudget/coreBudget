"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import ReportHeader from "../ReportHeader";
import ReportCard from "../ReportCard";
import type { GoalProgressData } from "../reportQueries";

export default function GoalProgressReportView({
  data,
  locale,
  currencyCode,
}: {
  data: GoalProgressData;
  locale: string | null;
  currencyCode: string;
}) {
  const t = useTranslations("reports.goalProgress");
  const tokens = useTokens();
  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  if (data.goals.length === 0) {
    return (
      <Box>
        <ReportHeader title={t("title")} subtitle={t("subtitle")} />
        <ReportCard>
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("empty")}
          </Typography>
        </ReportCard>
      </Box>
    );
  }

  return (
    <Box>
      <ReportHeader title={t("title")} subtitle={t("subtitle")} />
      <Stack sx={{ gap: "10px" }}>
        {data.goals.map((g) => (
          <ReportCard key={g.categoryId}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: "6px", gap: 1 }}
            >
              <Box>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 700 }}
                  style={{ color: tokens.textBody }}
                >
                  {g.name}
                </Typography>
                <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                  {g.targetDueDate
                    ? t("targetWithDate", {
                        amount: money(g.targetTotal),
                        date: formatDateOnly(g.targetDueDate, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                      })
                    : t("targetNoDate", { amount: money(g.targetTotal) })}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: "10px",
                  py: "3px",
                  borderRadius: "12px",
                  fontSize: 11,
                  fontWeight: 600,
                  flex: "none",
                }}
                style={{
                  backgroundColor: g.onTrack ? `${tokens.green}24` : `${tokens.amber}24`,
                  color: g.onTrack ? tokens.green : tokens.amber,
                }}
              >
                {g.onTrack ? t("onTrackBadge") : t("underfundedBadge")}
              </Box>
            </Stack>

            <Box
              sx={{ height: 7, borderRadius: "4px", mb: "6px" }}
              style={{ backgroundColor: tokens.hoverBackgroundStrong }}
            >
              <Box
                sx={{ height: "100%", borderRadius: "4px", width: `${Math.round(g.pct * 100)}%` }}
                style={{ backgroundColor: g.onTrack ? tokens.green : tokens.amber }}
              />
            </Box>

            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                {t("savedProgress", { amount: money(g.current), pct: Math.round(g.pct * 100) })}
              </Typography>
              <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                {t("monthlyProgress", {
                  needed: money(g.requiredMonthly),
                  contributing: money(g.contributingMonthly),
                })}
              </Typography>
            </Stack>
          </ReportCard>
        ))}
      </Stack>
    </Box>
  );
}
