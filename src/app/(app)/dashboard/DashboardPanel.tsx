"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import StarIcon from "@mui/icons-material/Star";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { formatYearMonth } from "@/lib/month";
import { useTour } from "../../_shared/tours/useTour";

export interface DashboardActionItemRow {
  id: string;
  priority: "high" | "medium" | "low";
  count: number;
  detail: string[];
}

interface DashboardOverspentRow {
  categoryId: string;
  categoryName: string;
  available: string;
}

export interface DashboardCurrentMonthBudgetRow {
  assigned: string;
  activity: string;
  available: string;
  mostOverspent: DashboardOverspentRow[];
}

export interface DashboardLiabilityProgressRow {
  id: string;
  name: string;
  pctPaid: number;
}

export interface DashboardTransactionRow {
  id: string;
  payeeName: string;
  date: string;
  accountName: string;
  categoryName: string | null;
  amount: string;
  cleared: boolean;
}

export interface DashboardUpcomingRow {
  id: string;
  payeeName: string;
  date: string;
  amount: string;
}

export interface DashboardFavoriteCategoryRow {
  id: string;
  name: string;
  hasRow: boolean;
  assigned: string;
  activity: string;
  available: string;
}

const priorityColorKey: Record<DashboardActionItemRow["priority"], "red" | "amber" | "blue"> = {
  high: "red",
  medium: "amber",
  low: "blue",
};

function Card({ children, dataTour }: { children: React.ReactNode; dataTour?: string }) {
  const tokens = useTokens();
  return (
    <Box
      data-tour={dataTour}
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "14px 16px", flex: 1 }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      {children}
    </Box>
  );
}

export default function DashboardPanel({
  userName,
  locale,
  currencyCode,
  month,
  summary,
  actionItems,
  currentMonthBudget,
  debtPayoff,
  recentTransactions,
  upcomingScheduled,
  upcomingNetChange,
  favoriteCategories,
}: {
  userName: string;
  locale: string | null;
  currencyCode: string;
  month: string;
  summary: {
    netWorth: string;
    totalCash: string;
    totalCredit: string;
    totalAssets: string;
    totalLoans: string;
  };
  actionItems: DashboardActionItemRow[];
  currentMonthBudget: DashboardCurrentMonthBudgetRow;
  debtPayoff: DashboardLiabilityProgressRow[];
  recentTransactions: DashboardTransactionRow[];
  upcomingScheduled: DashboardUpcomingRow[];
  upcomingNetChange: string;
  favoriteCategories: DashboardFavoriteCategoryRow[];
}) {
  const t = useTranslations("dashboard");
  const tokens = useTokens();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useTour("page:dashboard", [
    {
      element: '[data-tour="dashboard-summary"]',
      title: t("tour.summary.title"),
      description: t("tour.summary.description"),
      side: "bottom",
    },
    {
      element: '[data-tour="dashboard-current-month-budget"]',
      title: t("tour.currentMonthBudget.title"),
      description: t("tour.currentMonthBudget.description"),
      side: "top",
    },
    {
      element: '[data-tour="dashboard-recent-transactions"]',
      title: t("tour.recentTransactions.title"),
      description: t("tour.recentTransactions.description"),
      side: "top",
    },
  ]);

  const money = (amount: string | number) => formatCurrency(amount, locale, currencyCode);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sumColor(value: number): string {
    if (value < 0) return tokens.red;
    if (value === 0) return tokens.textBody;
    return tokens.green;
  }

  const summaryCards: { label: string; value: number; color: string }[] = [
    { label: t("summaryNetWorth"), value: Number(summary.netWorth), color: tokens.textBody },
    { label: t("summaryTotalCash"), value: Number(summary.totalCash), color: tokens.cashPositive },
    { label: t("summaryTotalCredit"), value: Number(summary.totalCredit), color: tokens.red },
    { label: t("summaryTotalAssets"), value: Number(summary.totalAssets), color: tokens.textBody },
    { label: t("summaryTotalLoans"), value: -Number(summary.totalLoans), color: tokens.red },
  ];

  const sectionTitle = (label: string) => (
    <Typography
      sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
      style={{ color: tokens.textBody }}
    >
      {label}
    </Typography>
  );

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: "18px",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
          style={{ color: tokens.textPrimary }}
        >
          {t("welcomeTitle", { name: userName })}
        </Typography>
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {formatYearMonth(month, locale)}
        </Typography>
      </Stack>

      {/* 1. Summary cards */}
      <Box
        data-tour="dashboard-summary"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(5, 1fr)" },
          gap: "10px",
          mb: "16px",
        }}
      >
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <Typography
              sx={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}
              style={{ color: tokens.textFaint }}
            >
              {card.label}
            </Typography>
            <Typography
              sx={{ fontSize: 18, fontWeight: 700, mt: "2px" }}
              style={{ color: card.color }}
            >
              {money(card.value)}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* 2. Favorite Categories */}
      <Box sx={{ mb: "16px" }}>
        <Card>
          {sectionTitle(t("favoriteCategoriesTitle"))}
          {favoriteCategories.length === 0 ? (
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("favoriteCategoriesEmpty")}
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {favoriteCategories.map((c) => (
                <Link key={c.id} href={`/budget?month=${month}`} style={{ textDecoration: "none" }}>
                  <Box
                    sx={{
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "8px",
                      p: "10px 12px",
                    }}
                  >
                    <Stack direction="row" sx={{ alignItems: "center", gap: "4px" }}>
                      <StarIcon sx={{ fontSize: 13 }} style={{ color: tokens.amber }} />
                      <Typography
                        sx={{ fontSize: 12.5, fontWeight: 500 }}
                        style={{ color: c.hasRow ? tokens.textBody : tokens.amber }}
                      >
                        {c.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: "space-between", mt: "4px" }}>
                      <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
                        {t("columnAvailable")}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12.5, fontWeight: 600 }}
                        style={{ color: sumColor(Number(c.available)) }}
                      >
                        {money(c.available)}
                      </Typography>
                    </Stack>
                  </Box>
                </Link>
              ))}
            </Box>
          )}
        </Card>
      </Box>

      {/* 3. Three-column row: Action Items / Current Month Budget / Debt Payoff Progress */}
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: "14px", mb: "16px" }}>
        <Card>
          {sectionTitle(t("actionItemsTitle"))}
          {actionItems.length === 0 ? (
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("actionItemsEmpty")}
            </Typography>
          ) : (
            <Stack sx={{ gap: 0 }}>
              {actionItems.map((item, i) => {
                const expanded = expandedIds.has(item.id);
                return (
                  <Box
                    key={item.id}
                    sx={{
                      py: "8px",
                      borderBottom:
                        i < actionItems.length - 1 ? `1px solid ${tokens.divider}` : "none",
                    }}
                  >
                    <Box
                      component="button"
                      onClick={() => toggleExpanded(item.id)}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        p: 0,
                      }}
                    >
                      <Box
                        sx={{ width: 7, height: 7, borderRadius: "50%", mt: "5px", flex: "none" }}
                        style={{ backgroundColor: tokens[priorityColorKey[item.priority]] }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                          {td(t, `action_${item.id}`, { count: item.count })}
                        </Typography>
                      </Box>
                      {item.detail.length > 0 &&
                        (expanded ? (
                          <ExpandLessIcon
                            sx={{ fontSize: 16 }}
                            style={{ color: tokens.textFaint }}
                          />
                        ) : (
                          <ExpandMoreIcon
                            sx={{ fontSize: 16 }}
                            style={{ color: tokens.textFaint }}
                          />
                        ))}
                    </Box>
                    {expanded && item.detail.length > 0 && (
                      <Stack sx={{ gap: "3px", mt: "6px", pl: "15px" }}>
                        {item.detail.map((d, di) => (
                          <Typography
                            key={di}
                            sx={{ fontSize: 11 }}
                            style={{ color: tokens.textFaint }}
                          >
                            {d}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Card>

        <Card dataTour="dashboard-current-month-budget">
          {sectionTitle(t("currentMonthBudgetTitle", { month: formatYearMonth(month, locale) }))}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              [t("columnAssigned"), money(currentMonthBudget.assigned), tokens.textBody],
              [t("columnActivity"), money(currentMonthBudget.activity), tokens.textBody],
              [
                t("columnAvailable"),
                money(currentMonthBudget.available),
                sumColor(Number(currentMonthBudget.available)),
              ],
            ].map(([label, value, color]) => (
              <Box key={label}>
                <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                  {label}
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
          {currentMonthBudget.mostOverspent.length > 0 && (
            <Box sx={{ mt: "10px", pt: "10px", borderTop: `1px solid ${tokens.divider}` }}>
              <Typography sx={{ fontSize: 10.5, mb: "4px" }} style={{ color: tokens.textFaint }}>
                {t("mostOverspentLabel")}
              </Typography>
              <Stack sx={{ gap: "2px" }}>
                {currentMonthBudget.mostOverspent.map((o) => (
                  <Stack
                    key={o.categoryId}
                    direction="row"
                    sx={{ justifyContent: "space-between" }}
                  >
                    <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textBody }}>
                      {o.categoryName}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 11.5, fontWeight: 600 }}
                      style={{ color: tokens.red }}
                    >
                      {money(o.available)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Card>

        <Card>
          {sectionTitle(t("debtPayoffTitle"))}
          {debtPayoff.length === 0 ? (
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("debtPayoffEmpty")}
            </Typography>
          ) : (
            <Stack sx={{ gap: "10px" }}>
              {debtPayoff.map((l) => (
                <Box key={l.id}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mb: "4px" }}>
                    <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textBody }}>
                      {l.name}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, fontWeight: 600 }}
                      style={{ color: tokens.textFaint }}
                    >
                      {l.pctPaid}%
                    </Typography>
                  </Stack>
                  <Box
                    sx={{ height: 6, borderRadius: "3px", overflow: "hidden" }}
                    style={{ backgroundColor: tokens.hoverBackgroundStrong }}
                  >
                    <Box
                      sx={{ height: "100%", width: `${Math.min(100, Math.max(0, l.pctPaid))}%` }}
                      style={{ backgroundColor: tokens.blue }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      </Stack>

      {/* 4. Two-column row: Recent Transactions / Upcoming Scheduled */}
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: "14px" }}>
        <Card dataTour="dashboard-recent-transactions">
          {sectionTitle(t("recentTransactionsTitle"))}
          {recentTransactions.length === 0 ? (
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("recentTransactionsEmpty")}
            </Typography>
          ) : (
            <Stack sx={{ gap: "8px" }}>
              {recentTransactions.map((txn) => (
                <Stack key={txn.id} direction="row" sx={{ justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      style={{ color: tokens.textBody }}
                    >
                      {txn.payeeName}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 10.5, mt: "1px" }}
                      style={{ color: tokens.textFaint }}
                    >
                      {formatDateOnly(txn.date, { month: "short", day: "numeric" })} ·{" "}
                      {txn.categoryName ?? t("uncategorizedLabel")}
                      {!txn.cleared ? ` · ${t("pendingBadge")}` : ""}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 600, flex: "none", ml: "8px" }}
                    style={{ color: Number(txn.amount) < 0 ? tokens.textBody : tokens.green }}
                  >
                    {money(txn.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Card>

        <Card>
          {sectionTitle(t("upcomingScheduledTitle"))}
          {upcomingScheduled.length === 0 ? (
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("upcomingScheduledEmpty")}
            </Typography>
          ) : (
            <>
              <Stack sx={{ gap: "8px" }}>
                {upcomingScheduled.map((u) => (
                  <Stack key={u.id} direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                      {u.payeeName} · {formatDateOnly(u.date, { month: "short", day: "numeric" })}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12.5, fontWeight: 600 }}
                      style={{ color: Number(u.amount) < 0 ? tokens.textBody : tokens.green }}
                    >
                      {money(u.amount)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  mt: "10px",
                  pt: "10px",
                  borderTop: `1px solid ${tokens.divider}`,
                }}
              >
                <Typography
                  sx={{ fontSize: 12, fontWeight: 600 }}
                  style={{ color: tokens.textBody }}
                >
                  {t("netChangeLabel")}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 700 }}
                  style={{ color: tokens.green }}
                >
                  {money(upcomingNetChange)}
                </Typography>
              </Stack>
            </>
          )}
        </Card>
      </Stack>
    </Box>
  );
}
