"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightNavIcon from "@mui/icons-material/ChevronRight";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import AdminButton from "../../admin/_shared/AdminButton";
import CollapsibleGroup from "../CollapsibleGroup";
import { useIsMobile } from "../useIsMobile";
import { useTokens } from "@/theme";
import { useServerAction } from "../../_shared/useServerAction";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { evaluateInlineMath } from "@/lib/inlineMath";
import { remainingMonthlyTargetAmount } from "@/lib/categoryTarget";
import { formatYearMonth, shiftYearMonth } from "@/lib/month";
import { useTour } from "../../_shared/tours/useTour";
import {
  autoAssignAction,
  createMissingAssignmentsAction,
  toggleFavoriteCategoryAction,
  updateAssignedAction,
  type AutoAssignMode,
} from "./actions";
import BudgetMobilePanel from "./BudgetMobilePanel";

interface BudgetActivityDetailRow {
  transactionId: string;
  date: string;
  payeeName: string;
  accountName: string;
  amount: string;
}

export interface BudgetCategoryRow {
  id: string;
  name: string;
  isFavorite: boolean;
  hasRow: boolean;
  assigned: string;
  activity: string;
  carryover: string;
  available: string;
  targetAmount: string | null;
  targetRepeatType: string | null;
  monthNeededBy: string | null;
  monthlyFundingGoal: string | null;
  savingsPerMonth: string | null;
  savingsPerQuarter: string | null;
  savingsPerYear: string | null;
  startDate: string | null;
  targetDueDate: string | null;
  activityDetails: BudgetActivityDetailRow[];
}

export interface BudgetSectionRow {
  id: string;
  name: string;
  categories: BudgetCategoryRow[];
}

function categoryTargetFields(c: BudgetCategoryRow) {
  return {
    targetAmount: c.targetAmount != null ? Number(c.targetAmount) : null,
    targetRepeatType: c.targetRepeatType,
    savingsPerMonth: c.savingsPerMonth != null ? Number(c.savingsPerMonth) : null,
    savingsPerQuarter: c.savingsPerQuarter != null ? Number(c.savingsPerQuarter) : null,
    savingsPerYear: c.savingsPerYear != null ? Number(c.savingsPerYear) : null,
    startDate: c.startDate,
    targetDueDate: c.targetDueDate,
  };
}

function hasTarget(c: BudgetCategoryRow): boolean {
  return !!c.targetRepeatType || c.targetAmount != null;
}

function resolveAssignedAmount(rawValue: string): number | null {
  const cleaned = rawValue.replace(/[^0-9+\-*/().\s]/g, "").trim();
  if (!cleaned) return 0;
  const evaluated = evaluateInlineMath(cleaned);
  if (evaluated !== null) return evaluated;
  const plain = Number(cleaned);
  return Number.isFinite(plain) ? plain : null;
}

export default function BudgetPanel({
  canEdit,
  locale,
  currencyCode,
  month,
  readyToAssign,
  sectionsDefaultOpen,
  sections,
}: {
  canEdit: boolean;
  locale: string | null;
  currencyCode: string;
  month: string;
  readyToAssign: string;
  sectionsDefaultOpen: boolean;
  sections: BudgetSectionRow[];
}) {
  const t = useTranslations("budget");
  const tokens = useTokens();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { pending, run } = useServerAction();

  useTour("page:budget", [
    {
      element: '[data-tour="budget-month-nav"]',
      title: t("tour.monthNav.title"),
      description: t("tour.monthNav.description"),
      side: "bottom",
    },
    {
      element: '[data-tour="budget-ready-to-assign"]',
      title: t("tour.readyToAssign.title"),
      description: t("tour.readyToAssign.description"),
      side: "bottom",
    },
    {
      element: '[data-tour="budget-category-table"]',
      title: t("tour.categoryTable.title"),
      description: t("tour.categoryTable.description"),
      side: "right",
    },
  ]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, sectionsDefaultOpen])),
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelCategoryId, setMobilePanelCategoryId] = useState<string | null>(null);
  const [editingAssignedId, setEditingAssignedId] = useState<string | null>(null);

  const money = (amount: string | number) => formatCurrency(amount, locale, currencyCode);

  function setAllSections(open: boolean) {
    setOpenSections(Object.fromEntries(sections.map((s) => [s.id, open])));
  }

  function toggleChecked(categoryId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function toggleSectionChecked(section: BudgetSectionRow) {
    const ids = section.categories.map((c) => c.id);
    const allChecked = ids.length > 0 && ids.every((id) => checkedIds.has(id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function handleAssignedCommit(categoryId: string, rawValue: string, previous: string) {
    const parsed = resolveAssignedAmount(rawValue);
    if (parsed === null || parsed === Number(previous)) return;
    run(
      () => updateAssignedAction(categoryId, month, parsed),
      () => router.refresh(),
    );
  }

  function handleToggleFavorite(categoryId: string) {
    run(
      () => toggleFavoriteCategoryAction(categoryId),
      () => router.refresh(),
    );
  }

  function handleCreateMissing() {
    run(
      () => createMissingAssignmentsAction(month),
      () => router.refresh(),
    );
  }

  function handleAutoAssign(mode: AutoAssignMode) {
    run(
      () => autoAssignAction(month, [...checkedIds], mode),
      () => {
        setCheckedIds(new Set());
        router.refresh();
      },
    );
  }

  const allCategories = useMemo(() => sections.flatMap((s) => s.categories), [sections]);
  const missingCategories = useMemo(() => allCategories.filter((c) => !c.hasRow), [allCategories]);
  const singleSelectedCategory =
    checkedIds.size === 1 ? (allCategories.find((c) => checkedIds.has(c.id)) ?? null) : null;

  const summary = useMemo(() => {
    return allCategories.reduce(
      (acc, c) => ({
        categories: acc.categories + 1,
        leftoverFromLastMonth: acc.leftoverFromLastMonth + Number(c.carryover),
        assigned: acc.assigned + Number(c.assigned),
        activity: acc.activity + Number(c.activity),
        available: acc.available + Number(c.available),
      }),
      { categories: 0, leftoverFromLastMonth: 0, assigned: 0, activity: 0, available: 0 },
    );
  }, [allCategories]);

  function neededThisMonth(c: BudgetCategoryRow): number {
    return remainingMonthlyTargetAmount(
      categoryTargetFields(c),
      c.monthNeededBy,
      c.monthlyFundingGoal,
      Number(c.carryover),
      month,
    );
  }

  function availableColor(c: BudgetCategoryRow): string {
    const available = Number(c.available);
    if (available < 0) return tokens.red;
    const target = neededThisMonth(c);
    const underfunded =
      hasTarget(c) && Math.round(Number(c.assigned) * 100) < Math.round(target * 100);
    if (underfunded) return tokens.amber;
    if (available === 0) return tokens.textBody;
    return tokens.green;
  }

  function sumColor(value: number): string {
    if (value < 0) return tokens.red;
    if (value === 0) return tokens.textBody;
    return tokens.green;
  }

  function goalLabel(c: BudgetCategoryRow): string | null {
    if (!hasTarget(c)) return null;
    const amt = neededThisMonth(c);
    switch (c.targetRepeatType) {
      case "monthly":
      case "quarterly":
      case "yearly":
        return t("goalPerMonth", { amount: money(amt) });
      case "long_term":
        return t("goalByDate", {
          amount: money(Number(c.targetAmount) || 0),
          date: c.targetDueDate
            ? formatDateOnly(c.targetDueDate, { month: "short", year: "numeric" })
            : t("tbd"),
        });
      default:
        return t("goalFlat", { amount: money(amt) });
    }
  }

  function goToMonth(nextMonth: string) {
    return `/budget?month=${nextMonth}`;
  }

  const monthNav = (
    <Stack
      direction="row"
      data-tour="budget-month-nav"
      sx={{
        height: 40,
        boxSizing: "border-box",
        alignItems: "center",
        gap: "10px",
        borderRadius: "8px",
        border: `1px solid ${tokens.border}`,
        px: "10px",
      }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Link
        href={goToMonth(shiftYearMonth(month, -1))}
        style={{ display: "flex", color: tokens.textFaint }}
        aria-label={t("previousMonth")}
      >
        <ChevronLeftIcon sx={{ fontSize: 18 }} />
      </Link>
      <Stack direction="row" sx={{ alignItems: "center", gap: "4px" }}>
        <CalendarMonthIcon
          sx={{ fontSize: 16, display: "block" }}
          style={{ color: tokens.textFaint }}
        />
        <TextField
          type="month"
          size="small"
          variant="standard"
          value={month}
          aria-label={t("selectMonth")}
          slotProps={{ input: { disableUnderline: true } }}
          onChange={(e) => {
            if (e.target.value) router.push(goToMonth(e.target.value));
          }}
          sx={{
            width: 122,
            "& input": { fontSize: 13.5, textAlign: "left", padding: 0, color: tokens.textBody },
            "& input::-webkit-calendar-picker-indicator": { display: "none" },
          }}
        />
      </Stack>
      <Link
        href={goToMonth(shiftYearMonth(month, 1))}
        style={{ display: "flex", color: tokens.textFaint }}
        aria-label={t("nextMonth")}
      >
        <ChevronRightNavIcon sx={{ fontSize: 18 }} />
      </Link>
    </Stack>
  );

  const readyToAssignTile = (
    <Box
      data-tour="budget-ready-to-assign"
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "14px 16px" }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography
        sx={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase" }}
        style={{ color: tokens.textFaint }}
      >
        {t("readyToAssignLabel")}
      </Typography>
      <Typography
        sx={{ fontSize: 22, fontWeight: 700, mt: "2px" }}
        style={{ color: sumColor(Number(readyToAssign)) }}
      >
        {money(readyToAssign)}
      </Typography>
    </Box>
  );

  const summaryCard = (
    <Box
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "14px 16px" }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: tokens.textBody }}>
        {t("summaryTitle")}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", mt: "10px" }}>
        {[
          [t("summaryCategories"), String(summary.categories)],
          [t("summaryLeftover"), money(summary.leftoverFromLastMonth)],
          [t("summaryAssigned"), money(summary.assigned)],
          [t("summaryActivity"), money(summary.activity)],
          [t("summaryAvailable"), money(summary.available)],
        ].map(([label, value]) => (
          <Box key={label}>
            <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: tokens.textBody }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const activityCard = singleSelectedCategory && (
    <Box
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "12px 16px" }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {t("activityTitle")}
      </Typography>
      {singleSelectedCategory.activityDetails.length === 0 ? (
        <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
          {t("activityEmpty")}
        </Typography>
      ) : (
        <Stack sx={{ gap: "8px" }}>
          {singleSelectedCategory.activityDetails.map((d, i) => (
            <Box
              key={d.transactionId + i}
              sx={{
                pb: i < singleSelectedCategory.activityDetails.length - 1 ? "8px" : 0,
                borderBottom:
                  i < singleSelectedCategory.activityDetails.length - 1
                    ? `1px solid ${tokens.divider}`
                    : "none",
              }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography
                  sx={{ fontSize: 12, fontWeight: 500 }}
                  style={{ color: tokens.textBody }}
                >
                  {d.payeeName}
                </Typography>
                <Typography
                  sx={{ fontSize: 12, fontWeight: 600 }}
                  style={{ color: Number(d.amount) < 0 ? tokens.red : tokens.green }}
                >
                  {money(Math.abs(Number(d.amount)))}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", mt: "2px" }}>
                <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
                  {formatDateOnly(d.date, { month: "short", day: "numeric" })} · {d.accountName}
                </Typography>
                <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
                  {Number(d.amount) < 0 ? t("debitLabel") : t("creditLabel")}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );

  function targetDetailsCard(c: BudgetCategoryRow) {
    const target = hasTarget(c) ? neededThisMonth(c) : Number(c.assigned);
    const assignedSoFar = Number(c.assigned);
    const toGo = Math.max(0, target - assignedSoFar);
    const pct = target > 0 ? Math.min(100, Math.round((assignedSoFar / target) * 100)) : 100;
    const met = assignedSoFar >= target;
    const ringColor = met ? tokens.green : tokens.amber;
    const r = 34;
    const circumf = 2 * Math.PI * r;

    return (
      <Box
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "12px 14px" }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} style={{ color: tokens.textBody }}>
          {c.name}
        </Typography>
        <Typography sx={{ fontSize: 10.5, mt: "2px" }} style={{ color: tokens.textFaint }}>
          {goalLabel(c) ?? t("noTargetSet")}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", my: "10px" }}>
          <svg width={84} height={84} viewBox="0 0 84 84">
            <circle cx={42} cy={42} r={r} fill="none" stroke={tokens.border} strokeWidth={7} />
            <circle
              cx={42}
              cy={42}
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={7}
              strokeDasharray={circumf}
              strokeDashoffset={circumf * (1 - pct / 100)}
              strokeLinecap="round"
              transform="rotate(-90 42 42)"
            />
            <text
              x={42}
              y={47}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fill={tokens.textBody}
            >
              {pct}%
            </text>
          </svg>
        </Box>
        <Box
          sx={{
            textAlign: "center",
            fontSize: 11.5,
            fontWeight: 600,
            borderRadius: "6px",
            p: "7px 8px",
          }}
          style={{ color: tokens.pageBackground, backgroundColor: ringColor }}
        >
          {met ? t("targetMet") : t("targetUnderfunded")}
        </Box>
        <Stack sx={{ mt: "10px", gap: "6px" }}>
          {[
            [t("targetNeeded"), money(target), false],
            [t("targetAssignedSoFar"), money(assignedSoFar), false],
            [t("targetToGo"), money(toGo), true],
          ].map(([label, value, emphasize]) => (
            <Stack
              key={label as string}
              direction="row"
              sx={{
                justifyContent: "space-between",
                fontSize: 11,
                pt: emphasize ? "8px" : 0,
                borderTop: emphasize ? `1px solid ${tokens.divider}` : "none",
              }}
            >
              <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                {label}
              </Typography>
              <Typography
                sx={{ fontSize: 11, fontWeight: emphasize ? 700 : 500 }}
                style={{ color: tokens.textBody }}
              >
                {value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    );
  }

  const missingCallout = missingCategories.length > 0 && (
    <Box
      sx={{ border: `1px solid ${tokens.amber}4d`, borderRadius: "8px", p: "12px 14px" }}
      style={{ backgroundColor: `${tokens.amber}1a` }}
    >
      <Typography sx={{ fontSize: 12.5, mb: "8px" }} style={{ color: tokens.amber }}>
        {t("missingAssignments", {
          count: missingCategories.length,
          names: missingCategories.map((c) => c.name).join(", "),
        })}
      </Typography>
      {canEdit && (
        <AdminButton onClick={handleCreateMissing} disabled={pending}>
          {t("createItButton")}
        </AdminButton>
      )}
    </Box>
  );

  const autoAssignPanel = canEdit && checkedIds.size > 0 && (
    <Box
      sx={{ border: `1px solid ${tokens.blue}4d`, borderRadius: "8px", p: "12px 14px" }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography sx={{ fontSize: 12.5, mb: "8px" }} style={{ color: tokens.textBody }}>
        {t("autoAssignHeading", { count: checkedIds.size })}
      </Typography>
      <Stack direction="row" sx={{ gap: "8px", flexWrap: "wrap" }}>
        <AdminButton disabled={pending} onClick={() => handleAutoAssign("underfunded")}>
          {t("autoAssignUnderfunded")}
        </AdminButton>
        <AdminButton disabled={pending} onClick={() => handleAutoAssign("resetAvailableToZero")}>
          {t("autoAssignResetAvailable")}
        </AdminButton>
        <AdminButton disabled={pending} onClick={() => handleAutoAssign("resetAssignedToZero")}>
          {t("autoAssignResetAssigned")}
        </AdminButton>
      </Stack>
    </Box>
  );

  if (isMobile) {
    return (
      <Box sx={{ p: "14px" }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: "12px" }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700 }} style={{ color: tokens.textPrimary }}>
            {t("title")}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center", gap: "8px" }}>
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
              {formatYearMonth(month, locale)}
            </Typography>
            <Link
              href={goToMonth(shiftYearMonth(month, -1))}
              style={{ display: "flex", color: tokens.textFaint }}
            >
              <ChevronLeftIcon sx={{ fontSize: 18 }} />
            </Link>
            <Link
              href={goToMonth(shiftYearMonth(month, 1))}
              style={{ display: "flex", color: tokens.textFaint }}
            >
              <ChevronRightNavIcon sx={{ fontSize: 18 }} />
            </Link>
            <Box
              component="button"
              onClick={() => {
                setMobilePanelCategoryId(null);
                setMobilePanelOpen(true);
              }}
              aria-label={t("openSummary")}
              sx={{
                width: 30,
                height: 30,
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              style={{ backgroundColor: tokens.cardBackground, color: tokens.textFaint }}
            >
              <MenuOpenIcon sx={{ fontSize: 16 }} />
            </Box>
          </Stack>
        </Stack>

        <Stack sx={{ gap: "14px" }}>
          {sections.map((section) => (
            <Box key={section.id}>
              <Typography
                sx={{ fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", p: "4px 2px" }}
                style={{ color: tokens.textFaint }}
              >
                {section.name}
              </Typography>
              <Stack sx={{ gap: "6px" }}>
                {section.categories.map((c) => (
                  <Box
                    key={c.id}
                    component="button"
                    onClick={() => {
                      setMobilePanelCategoryId(c.id);
                      setMobilePanelOpen(true);
                    }}
                    sx={{
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "10px",
                      p: "11px 13px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                    style={{ backgroundColor: tokens.cardBackground }}
                  >
                    <Box>
                      <Typography
                        sx={{ fontSize: 13.5 }}
                        style={{ color: c.hasRow ? tokens.textBody : tokens.amber }}
                      >
                        {c.isFavorite && "★ "}
                        {c.name}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11, mt: "2px" }}
                        style={{ color: tokens.textFaint }}
                      >
                        {t("assignedInline", { amount: money(c.assigned) })}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: 14, fontWeight: 700 }}
                      style={{ color: availableColor(c) }}
                    >
                      {money(c.available)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>

        {mobilePanelOpen && (
          <BudgetMobilePanel
            category={allCategories.find((c) => c.id === mobilePanelCategoryId) ?? null}
            locale={locale}
            currencyCode={currencyCode}
            canEdit={canEdit}
            readyToAssignTile={readyToAssignTile}
            summaryCard={summaryCard}
            missingCallout={missingCallout}
            renderActivityCard={(c) =>
              c.activityDetails.length === 0 ? (
                <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                  {t("activityEmpty")}
                </Typography>
              ) : (
                <Stack sx={{ gap: "8px" }}>
                  {c.activityDetails.map((d, i) => (
                    <Box key={d.transactionId + i}>
                      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                        <Typography
                          sx={{ fontSize: 12, fontWeight: 500 }}
                          style={{ color: tokens.textBody }}
                        >
                          {d.payeeName}
                        </Typography>
                        <Typography
                          sx={{ fontSize: 12, fontWeight: 600 }}
                          style={{ color: Number(d.amount) < 0 ? tokens.red : tokens.green }}
                        >
                          {money(Math.abs(Number(d.amount)))}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )
            }
            renderTargetCard={(c) => targetDetailsCard(c)}
            onCommitAssigned={handleAssignedCommit}
            onClose={() => setMobilePanelOpen(false)}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: "20px 18px", height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: "14px" }}
      >
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
          style={{ color: tokens.textPrimary }}
        >
          {t("title")}
        </Typography>
        <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
          <AdminButton
            startIcon={<UnfoldMoreIcon sx={{ fontSize: 14 }} />}
            onClick={() => setAllSections(true)}
          >
            {t("expandAll")}
          </AdminButton>
          <AdminButton
            startIcon={<UnfoldLessIcon sx={{ fontSize: 14 }} />}
            onClick={() => setAllSections(false)}
          >
            {t("collapseAll")}
          </AdminButton>
          {monthNav}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        sx={{ gap: "10px", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
      >
        <Box
          data-tour="budget-category-table"
          sx={{
            flex: "2 0 400px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "20px minmax(80px,1fr) 84px 84px 84px 84px 24px",
              gap: "8px",
              px: "10px",
              pb: "8px",
            }}
          >
            <span />
            <Typography
              sx={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase" }}
              style={{ color: tokens.textFaint }}
            >
              {t("columnCategory")}
            </Typography>
            {[
              t("columnCarryover"),
              t("columnAssigned"),
              t("columnActivity"),
              t("columnAvailable"),
            ].map((label) => (
              <Typography
                key={label}
                sx={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  textAlign: "right",
                }}
                style={{ color: tokens.textFaint }}
              >
                {label}
              </Typography>
            ))}
            <span />
          </Box>

          <Box sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
            <Stack sx={{ gap: "12px" }}>
              {sections.map((section) => {
                const ids = section.categories.map((c) => c.id);
                const allChecked = ids.length > 0 && ids.every((id) => checkedIds.has(id));
                const totals = section.categories.reduce(
                  (acc, c) => ({
                    carryover: acc.carryover + Number(c.carryover),
                    assigned: acc.assigned + Number(c.assigned),
                    activity: acc.activity + Number(c.activity),
                    available: acc.available + Number(c.available),
                  }),
                  { carryover: 0, assigned: 0, activity: 0, available: 0 },
                );
                return (
                  <Box
                    key={section.id}
                    sx={{
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                    style={{ backgroundColor: tokens.cardBackground }}
                  >
                    <CollapsibleGroup
                      open={openSections[section.id] ?? sectionsDefaultOpen}
                      onOpenChange={(open) =>
                        setOpenSections((prev) => ({ ...prev, [section.id]: open }))
                      }
                      label={
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "20px minmax(80px,1fr) 84px 84px 84px 84px 24px",
                            gap: "8px",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={allChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSectionChecked(section)}
                            sx={{ p: 0 }}
                          />
                          <Typography
                            sx={{ fontSize: 12.5, fontWeight: 600, textTransform: "uppercase" }}
                            style={{ color: tokens.textBody }}
                          >
                            {section.name}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11.5, textAlign: "right" }}
                            style={{ color: sumColor(totals.carryover) }}
                          >
                            {money(totals.carryover)}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11.5, textAlign: "right" }}
                            style={{ color: tokens.textFaint }}
                          >
                            {money(totals.assigned)}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11.5, textAlign: "right" }}
                            style={{ color: tokens.textFaint }}
                          >
                            {money(totals.activity)}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11.5, fontWeight: 600, textAlign: "right" }}
                            style={{ color: sumColor(totals.available) }}
                          >
                            {money(totals.available)}
                          </Typography>
                          <span />
                        </Box>
                      }
                    >
                      <Box sx={{ borderTop: `1px solid ${tokens.divider}` }}>
                        {section.categories.length === 0 && (
                          <Typography
                            sx={{ fontSize: 12.5, p: "12px 14px" }}
                            style={{ color: tokens.textFaint }}
                          >
                            {t("noCategoriesInSection")}
                          </Typography>
                        )}
                        {section.categories.map((c, i) => {
                          const checked = checkedIds.has(c.id);
                          const label = goalLabel(c);
                          return (
                            <Box
                              key={c.id}
                              onClick={() => toggleChecked(c.id)}
                              sx={{
                                display: "grid",
                                gridTemplateColumns:
                                  "20px minmax(80px,1fr) 84px 84px 84px 84px 24px",
                                gap: "8px",
                                alignItems: "center",
                                p: "9px 10px",
                                cursor: "pointer",
                                borderBottom:
                                  i < section.categories.length - 1
                                    ? `1px solid ${tokens.divider}`
                                    : "none",
                              }}
                              style={{
                                backgroundColor: checked ? `${tokens.blue}0f` : "transparent",
                              }}
                            >
                              <Checkbox
                                size="small"
                                checked={checked}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => toggleChecked(c.id)}
                                sx={{ p: 0 }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: 12.5,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  style={{ color: c.hasRow ? tokens.textBody : tokens.amber }}
                                >
                                  {c.name}
                                </Typography>
                                {label && (
                                  <Typography
                                    sx={{ fontSize: 10.5, mt: "1px" }}
                                    style={{ color: tokens.textFaint }}
                                  >
                                    {label}
                                  </Typography>
                                )}
                              </Box>
                              <Typography
                                sx={{ fontSize: 12, textAlign: "right" }}
                                style={{ color: tokens.textFaint }}
                              >
                                {money(c.carryover)}
                              </Typography>
                              {editingAssignedId === c.id ? (
                                <TextField
                                  key={c.assigned}
                                  size="small"
                                  variant="outlined"
                                  autoFocus
                                  defaultValue={money(c.assigned)}
                                  aria-label={t("assignedAmountLabel", { name: c.name })}
                                  onClick={(e) => e.stopPropagation()}
                                  onFocus={(e) => e.target.select()}
                                  onBlur={(e) => {
                                    handleAssignedCommit(c.id, e.target.value, c.assigned);
                                    setEditingAssignedId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                    if (e.key === "Escape") setEditingAssignedId(null);
                                  }}
                                  sx={{
                                    "& .MuiOutlinedInput-root": {
                                      backgroundColor: tokens.pageBackground,
                                    },
                                    "& input": {
                                      fontSize: 12,
                                      textAlign: "right",
                                      padding: "4px 6px",
                                      color: tokens.textBody,
                                    },
                                  }}
                                />
                              ) : (
                                <Typography
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (canEdit) setEditingAssignedId(c.id);
                                  }}
                                  sx={{
                                    fontSize: 12,
                                    textAlign: "right",
                                    borderRadius: "4px",
                                    px: "2px",
                                  }}
                                  style={{
                                    color: tokens.textBody,
                                    cursor: canEdit ? "text" : "default",
                                  }}
                                >
                                  {money(c.assigned)}
                                </Typography>
                              )}
                              <Typography
                                sx={{ fontSize: 12, textAlign: "right" }}
                                style={{ color: tokens.textFaint }}
                              >
                                {money(c.activity)}
                              </Typography>
                              <Typography
                                sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}
                                style={{ color: availableColor(c) }}
                              >
                                {money(c.available)}
                              </Typography>
                              <Box
                                component="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(c.id);
                                }}
                                sx={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  p: 0,
                                }}
                                aria-label={t("toggleFavorite")}
                              >
                                {c.isFavorite ? (
                                  <StarIcon sx={{ fontSize: 15 }} style={{ color: tokens.amber }} />
                                ) : (
                                  <StarBorderIcon
                                    sx={{ fontSize: 15 }}
                                    style={{ color: tokens.textFaint }}
                                  />
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </CollapsibleGroup>
                  </Box>
                );
              })}
            </Stack>
            <Box sx={{ height: 24 }} />
          </Box>
        </Box>

        <Box
          sx={{
            flex: "1 1 260px",
            minWidth: 220,
            maxWidth: 380,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {readyToAssignTile}
          {summaryCard}
          {activityCard}
          {singleSelectedCategory && targetDetailsCard(singleSelectedCategory)}
          {missingCallout}
          {autoAssignPanel}
        </Box>
      </Stack>
    </Box>
  );
}
