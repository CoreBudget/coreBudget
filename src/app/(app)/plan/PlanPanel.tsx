"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import SectionHeader from "../../admin/_shared/SectionHeader";
import AdminButton from "../../admin/_shared/AdminButton";
import CollapsibleGroup from "../CollapsibleGroup";
import { useIsMobile } from "../useIsMobile";
import { useTokens } from "@/theme";
import { useServerAction } from "../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnlyPreference } from "@/lib/date";
import { monthlyTargetAmount, monthsBetweenDates } from "@/lib/categoryTarget";
import { clearCategoryTargetAction, updateCategoryTargetAction } from "./actions";
import { useTour } from "../../_shared/tours/useTour";

export interface PlanCategoryRow {
  id: string;
  name: string;
  targetRepeatType: string | null;
  targetAmount: string | null;
  savingsPerMonth: string | null;
  dayOfMonth: number | null;
  monthlyFundingGoal: string | null;
  savingsPerQuarter: string | null;
  quarterlyMonths: number[];
  savingsPerYear: string | null;
  monthNeededBy: string | null;
  startDate: string | null;
  targetDueDate: string | null;
  notes: string | null;
}

export interface PlanSectionRow {
  id: string;
  name: string;
  type: string;
  categories: PlanCategoryRow[];
}

type RepeatType = "none" | "monthly" | "quarterly" | "yearly" | "long_term";

interface TargetDraft {
  targetRepeatType: RepeatType;
  targetAmount: string;
  savingsPerMonth: string;
  dayOfMonth: string;
  monthlyFundingGoal: "assign_target" | "reach_target";
  savingsPerQuarter: string;
  quarterlyMonths: number[];
  savingsPerYear: string;
  monthNeededBy: string;
  startDate: string;
  targetDueDate: string;
  notes: string;
}

const MONTH_LABEL_KEYS = [
  "plan.months.jan",
  "plan.months.feb",
  "plan.months.mar",
  "plan.months.apr",
  "plan.months.may",
  "plan.months.jun",
  "plan.months.jul",
  "plan.months.aug",
  "plan.months.sep",
  "plan.months.oct",
  "plan.months.nov",
  "plan.months.dec",
];

function draftFromCategory(c: PlanCategoryRow): TargetDraft {
  return {
    targetRepeatType: (c.targetRepeatType as RepeatType) ?? "none",
    targetAmount: c.targetAmount ?? "",
    savingsPerMonth: c.savingsPerMonth ?? "",
    dayOfMonth: c.dayOfMonth != null ? String(c.dayOfMonth) : "1",
    monthlyFundingGoal:
      (c.monthlyFundingGoal as "assign_target" | "reach_target") ?? "reach_target",
    savingsPerQuarter: c.savingsPerQuarter ?? "",
    quarterlyMonths: c.quarterlyMonths,
    savingsPerYear: c.savingsPerYear ?? "",
    monthNeededBy: c.monthNeededBy ?? "0",
    startDate: c.startDate ?? "",
    targetDueDate: c.targetDueDate ?? "",
    notes: c.notes ?? "",
  };
}

function draftToFormData(draft: TargetDraft): FormData {
  const fd = new FormData();
  fd.set("targetRepeatType", draft.targetRepeatType);
  fd.set("targetAmount", draft.targetAmount);
  fd.set("savingsPerMonth", draft.savingsPerMonth);
  fd.set("dayOfMonth", draft.dayOfMonth);
  fd.set("monthlyFundingGoal", draft.monthlyFundingGoal);
  fd.set("savingsPerQuarter", draft.savingsPerQuarter);
  fd.set("quarterlyMonths", JSON.stringify(draft.quarterlyMonths));
  fd.set("savingsPerYear", draft.savingsPerYear);
  fd.set("monthNeededBy", draft.monthNeededBy);
  fd.set("startDate", draft.startDate);
  fd.set("targetDueDate", draft.targetDueDate);
  fd.set("notes", draft.notes);
  return fd;
}

function categoryToTargetFields(c: PlanCategoryRow) {
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

export default function PlanPanel({
  canEdit,
  locale,
  dateFormatPreference,
  currencyCode,
  sections,
  sectionsDefaultOpen,
}: {
  canEdit: boolean;
  locale: string | null;
  dateFormatPreference: string | null;
  currencyCode: string;
  sections: PlanSectionRow[];
  sectionsDefaultOpen: boolean;
}) {
  const t = useTranslations("plan");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const router = useRouter();
  const { pending, run } = useServerAction();

  useTour("page:plan", [
    {
      element: '[data-tour="plan-summary"]',
      title: t("tour.summary.title"),
      description: t("tour.summary.description"),
      side: "bottom",
    },
    {
      element: '[data-tour="plan-sections"]',
      title: t("tour.sections.title"),
      description: t("tour.sections.description"),
      side: "top",
    },
  ]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TargetDraft | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, sectionsDefaultOpen])),
  );
  const [showYearly, setShowYearly] = useState(false);

  function setAllSections(open: boolean) {
    setOpenSections(Object.fromEntries(sections.map((s) => [s.id, open])));
  }

  const money = (amount: number) => formatCurrency(amount, locale, currencyCode);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const section of sections) {
      for (const category of section.categories) {
        const amt = monthlyTargetAmount(categoryToTargetFields(category));
        if (section.type === "income") totalIncome += amt;
        else totalExpenses += amt;
      }
    }
    return { totalIncome, totalExpenses, availableCash: totalIncome - totalExpenses };
  }, [sections]);

  function goalLabel(category: PlanCategoryRow): string {
    if (!category.targetRepeatType && category.targetAmount == null) {
      return t("noTarget");
    }
    const amt = monthlyTargetAmount(categoryToTargetFields(category));
    const label = t("perMonth", { amount: money(amt) });
    return showYearly ? `${label} · ${t("perYear", { amount: money(amt * 12) })}` : label;
  }

  function toggleRow(categoryId: string) {
    if (expandedId === categoryId) {
      setExpandedId(null);
      setEditingId(null);
      setDraft(null);
    } else {
      setExpandedId(categoryId);
      setEditingId(null);
      setDraft(null);
    }
  }

  function startEdit(category: PlanCategoryRow) {
    setEditingId(category.id);
    setDraft(draftFromCategory(category));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function handleSave(categoryId: string) {
    if (!draft) return;
    run(
      () => updateCategoryTargetAction(categoryId, {}, draftToFormData(draft)),
      () => {
        setEditingId(null);
        setDraft(null);
        router.refresh();
      },
    );
  }

  function handleClear(categoryId: string) {
    run(
      () => clearCategoryTargetAction(categoryId),
      () => router.refresh(),
    );
  }

  const gridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 };

  function targetEditor(category: PlanCategoryRow) {
    if (!draft) return null;
    const monthlyEquivalent = monthlyTargetAmount({
      targetAmount: draft.targetAmount ? Number(draft.targetAmount) : null,
      targetRepeatType: draft.targetRepeatType === "none" ? null : draft.targetRepeatType,
      savingsPerMonth: draft.savingsPerMonth ? Number(draft.savingsPerMonth) : null,
      savingsPerQuarter: draft.savingsPerQuarter ? Number(draft.savingsPerQuarter) : null,
      savingsPerYear: draft.savingsPerYear ? Number(draft.savingsPerYear) : null,
      startDate: draft.startDate || null,
      targetDueDate: draft.targetDueDate || null,
    });
    const months = monthsBetweenDates(draft.startDate || null, draft.targetDueDate || null);
    const monthlyNeeded = months > 0 ? Number(draft.targetAmount || 0) / months : 0;

    return (
      <Box sx={{ pt: "14px" }}>
        <Box sx={{ ...gridSx, mb: 2 }}>
          <TextField
            select
            size="small"
            label={t("editor.repeatTypeLabel")}
            value={draft.targetRepeatType}
            onChange={(e) => setDraft({ ...draft, targetRepeatType: e.target.value as RepeatType })}
            fullWidth
            helperText={t("editor.repeatTypeHint")}
          >
            <MenuItem value="none">{t("repeatTypes.none")}</MenuItem>
            <MenuItem value="monthly">{t("repeatTypes.monthly")}</MenuItem>
            <MenuItem value="quarterly">{t("repeatTypes.quarterly")}</MenuItem>
            <MenuItem value="yearly">{t("repeatTypes.yearly")}</MenuItem>
            <MenuItem value="long_term">{t("repeatTypes.longTerm")}</MenuItem>
          </TextField>

          {draft.targetRepeatType === "none" && (
            <TextField
              size="small"
              label={t("editor.targetAmountLabel")}
              placeholder="0.00"
              value={draft.targetAmount}
              onChange={(e) => setDraft({ ...draft, targetAmount: e.target.value })}
              fullWidth
              helperText={t("editor.targetAmountHint")}
            />
          )}
          {draft.targetRepeatType === "long_term" && (
            <TextField
              size="small"
              label={t("editor.savingsTargetLabel")}
              placeholder="0.00"
              value={draft.targetAmount}
              onChange={(e) => setDraft({ ...draft, targetAmount: e.target.value })}
              fullWidth
              helperText={t("editor.savingsTargetHint")}
            />
          )}
          {(draft.targetRepeatType === "monthly" ||
            draft.targetRepeatType === "quarterly" ||
            draft.targetRepeatType === "yearly") && (
            <TextField
              size="small"
              label={t("editor.targetAmountAutoLabel")}
              value={money(monthlyEquivalent)}
              fullWidth
              disabled
              helperText={t(`editor.targetAmountAutoHint.${draft.targetRepeatType}`)}
            />
          )}
        </Box>

        {draft.targetRepeatType === "monthly" && (
          <Box sx={{ ...gridSx, mb: 2 }}>
            <TextField
              size="small"
              label={t("editor.savingsPerMonthLabel")}
              placeholder="0.00"
              value={draft.savingsPerMonth}
              onChange={(e) => setDraft({ ...draft, savingsPerMonth: e.target.value })}
              fullWidth
            />
            <TextField
              size="small"
              type="number"
              label={t("editor.dayOfMonthLabel")}
              value={draft.dayOfMonth}
              onChange={(e) => setDraft({ ...draft, dayOfMonth: e.target.value })}
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 31 } }}
            />
          </Box>
        )}

        {draft.targetRepeatType === "monthly" && (
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{ fontSize: 11, fontWeight: 600, mb: "8px", textTransform: "uppercase" }}
              style={{ color: tokens.textFaint }}
            >
              {t("editor.fundingGoalLabel")}
            </Typography>
            <RadioGroup
              value={draft.monthlyFundingGoal}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  monthlyFundingGoal: e.target.value as "assign_target" | "reach_target",
                })
              }
            >
              <FormControlLabel
                value="reach_target"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                      {t("editor.fundingGoalReachTarget")}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
                      {t("editor.fundingGoalReachTargetHint")}
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="assign_target"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                      {t("editor.fundingGoalAssignTarget")}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
                      {t("editor.fundingGoalAssignTargetHint")}
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>
        )}

        {draft.targetRepeatType === "quarterly" && (
          <Box sx={{ ...gridSx, mb: 2 }}>
            <TextField
              size="small"
              label={t("editor.savingsPerQuarterLabel")}
              placeholder="0.00"
              value={draft.savingsPerQuarter}
              onChange={(e) => setDraft({ ...draft, savingsPerQuarter: e.target.value })}
              fullWidth
            />
            <TextField
              size="small"
              label={t("editor.savingsPerYearAutoLabel")}
              value={money((Number(draft.savingsPerQuarter) || 0) * 4)}
              fullWidth
              disabled
            />
          </Box>
        )}

        {draft.targetRepeatType === "quarterly" && (
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{ fontSize: 11, fontWeight: 600, mb: "8px", textTransform: "uppercase" }}
              style={{ color: tokens.textFaint }}
            >
              {t("editor.quarterlyMonthsLabel")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr 1fr", sm: "repeat(6, 1fr)" },
                gap: "6px",
              }}
            >
              {MONTH_LABEL_KEYS.map((key, idx) => {
                const checked = draft.quarterlyMonths.includes(idx);
                return (
                  <FormControlLabel
                    key={key}
                    sx={{
                      m: 0,
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "6px",
                      px: "6px",
                    }}
                    control={
                      <Checkbox
                        size="small"
                        checked={checked}
                        onChange={() => {
                          const exists = draft.quarterlyMonths.includes(idx);
                          const next = exists
                            ? draft.quarterlyMonths.filter((m) => m !== idx)
                            : draft.quarterlyMonths.length < 4
                              ? [...draft.quarterlyMonths, idx]
                              : draft.quarterlyMonths;
                          setDraft({ ...draft, quarterlyMonths: next });
                        }}
                      />
                    }
                    label={<Typography sx={{ fontSize: 11.5 }}>{td(tRoot, key)}</Typography>}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {draft.targetRepeatType === "yearly" && (
          <Box sx={{ ...gridSx, mb: 2 }}>
            <TextField
              size="small"
              label={t("editor.savingsPerYearLabel")}
              placeholder="0.00"
              value={draft.savingsPerYear}
              onChange={(e) => setDraft({ ...draft, savingsPerYear: e.target.value })}
              fullWidth
            />
            <TextField
              select
              size="small"
              label={t("editor.monthNeededByLabel")}
              value={draft.monthNeededBy}
              onChange={(e) => setDraft({ ...draft, monthNeededBy: e.target.value })}
              fullWidth
            >
              {MONTH_LABEL_KEYS.map((key, idx) => (
                <MenuItem key={key} value={String(idx)}>
                  {td(tRoot, key)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        )}

        {draft.targetRepeatType === "long_term" && (
          <Box sx={{ ...gridSx, mb: 2 }}>
            <TextField
              type="date"
              size="small"
              label={t("editor.startDateLabel")}
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              size="small"
              label={t("editor.targetDueDateLabel")}
              value={draft.targetDueDate}
              onChange={(e) => setDraft({ ...draft, targetDueDate: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        )}

        {draft.targetRepeatType === "long_term" && (
          <Box sx={{ ...gridSx, mb: 2 }}>
            <TextField
              size="small"
              label={t("editor.monthlySavingsNeededLabel")}
              value={money(monthlyNeeded)}
              fullWidth
              disabled
            />
            <TextField
              size="small"
              label={t("editor.annualSavingsNeededLabel")}
              value={money(monthlyNeeded * 12)}
              fullWidth
              disabled
            />
          </Box>
        )}

        <TextField
          size="small"
          label={t("editor.notesLabel")}
          placeholder={t("editor.notesPlaceholder")}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          fullWidth
          multiline
          minRows={2}
          sx={{ mb: 2 }}
        />

        <Stack direction="row" sx={{ gap: 1, justifyContent: "flex-end" }}>
          <AdminButton onClick={cancelEdit}>{tRoot("common.cancel")}</AdminButton>
          <AdminButton
            variant="contained"
            disabled={pending}
            onClick={() => handleSave(category.id)}
          >
            {t("editor.saveButton")}
          </AdminButton>
        </Stack>
      </Box>
    );
  }

  function targetView(category: PlanCategoryRow) {
    const hasTarget = !!category.targetRepeatType || category.targetAmount != null;
    const repeatType = category.targetRepeatType ?? "none";

    return (
      <Box sx={{ pt: "14px" }}>
        {!hasTarget ? (
          <Typography sx={{ fontSize: 12.5, mb: "12px" }} style={{ color: tokens.textFaint }}>
            {t("noTargetSet")}
          </Typography>
        ) : (
          <Stack sx={{ gap: "8px", mb: "14px" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                {t("editor.repeatTypeLabel")}
              </Typography>
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 500 }}
                style={{ color: tokens.textBody }}
              >
                {td(
                  tRoot,
                  `plan.repeatTypes.${repeatType === "long_term" ? "longTerm" : repeatType}`,
                )}
              </Typography>
            </Stack>

            {repeatType === "none" && (
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                  {t("editor.targetAmountLabel")}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 500 }}
                  style={{ color: tokens.textBody }}
                >
                  {money(Number(category.targetAmount) || 0)}
                </Typography>
              </Stack>
            )}

            {repeatType === "monthly" && (
              <>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.savingsPerMonthLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money(Number(category.savingsPerMonth) || 0)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.dayOfMonthLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {category.dayOfMonth ?? 1}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.fundingGoalLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {category.monthlyFundingGoal === "assign_target"
                      ? t("editor.fundingGoalAssignTarget")
                      : t("editor.fundingGoalReachTarget")}
                  </Typography>
                </Stack>
              </>
            )}

            {repeatType === "quarterly" && (
              <>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.savingsPerQuarterLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money(Number(category.savingsPerQuarter) || 0)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.quarterlyMonthsLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {category.quarterlyMonths.length > 0
                      ? category.quarterlyMonths
                          .map((idx) => td(tRoot, MONTH_LABEL_KEYS[idx]))
                          .join(", ")
                      : "-"}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.savingsPerYearAutoLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money((Number(category.savingsPerQuarter) || 0) * 4)}
                  </Typography>
                </Stack>
              </>
            )}

            {repeatType === "yearly" && (
              <>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.savingsPerYearLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money(Number(category.savingsPerYear) || 0)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.monthNeededByLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {td(tRoot, MONTH_LABEL_KEYS[Number(category.monthNeededBy) || 0])}
                  </Typography>
                </Stack>
              </>
            )}

            {repeatType === "long_term" && (
              <>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.savingsTargetLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {money(Number(category.targetAmount) || 0)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.startDateLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {category.startDate
                      ? formatDateOnlyPreference(category.startDate, dateFormatPreference)
                      : t("tbd")}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("editor.targetDueDateLabel")}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 500 }}
                    style={{ color: tokens.textBody }}
                  >
                    {category.targetDueDate
                      ? formatDateOnlyPreference(category.targetDueDate, dateFormatPreference)
                      : t("tbd")}
                  </Typography>
                </Stack>
              </>
            )}

            {category.notes && (
              <Box>
                <Typography sx={{ fontSize: 11.5, mb: "2px" }} style={{ color: tokens.textFaint }}>
                  {t("editor.notesLabel")}
                </Typography>
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                  {category.notes}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {canEdit && (
          <Stack direction="row" sx={{ gap: 1 }}>
            <AdminButton variant="contained" onClick={() => startEdit(category)}>
              {hasTarget ? tRoot("common.edit") : t("setTargetButton")}
            </AdminButton>
            {hasTarget && (
              <AdminButton danger disabled={pending} onClick={() => handleClear(category.id)}>
                {t("clearTargetButton")}
              </AdminButton>
            )}
          </Stack>
        )}
      </Box>
    );
  }

  const sectionButtons = (
    <Stack direction="row" sx={{ gap: 1 }}>
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
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <SectionHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={isMobile ? undefined : sectionButtons}
      />
      {isMobile && <Box sx={{ mb: "20px" }}>{sectionButtons}</Box>}

      <Box
        data-tour="plan-summary"
        sx={{
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          p: "18px",
          mb: "20px",
        }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700 }} style={{ color: tokens.textBody }}>
          {t("summaryTitle")}
        </Typography>
        <Typography
          sx={{ fontSize: 11.5, mt: "4px", mb: "12px" }}
          style={{ color: tokens.textFaint }}
        >
          {t("summarySubtitle")}
        </Typography>
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            pt: "12px",
            borderTop: `1px solid ${tokens.divider}`,
          }}
        >
          <Stack direction="row" sx={{ gap: "32px", flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                {t("totalIncomeLabel")}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }} style={{ color: tokens.green }}>
                {money(totals.totalIncome)}
              </Typography>
              {showYearly && (
                <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                  {t("perYear", { amount: money(totals.totalIncome * 12) })}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                {t("totalExpensesLabel")}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }} style={{ color: tokens.textBody }}>
                {money(totals.totalExpenses)}
              </Typography>
              {showYearly && (
                <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                  {t("perYear", { amount: money(totals.totalExpenses * 12) })}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                {t("availableCashLabel")}
              </Typography>
              <Typography
                sx={{ fontSize: 16, fontWeight: 700 }}
                style={{ color: totals.availableCash >= 0 ? tokens.green : tokens.red }}
              >
                {money(totals.availableCash)}
              </Typography>
              {showYearly && (
                <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                  {t("perYear", { amount: money(totals.availableCash * 12) })}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" sx={{ alignItems: "center", gap: "6px" }}>
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
              {t("yearlyToggleLabel")}
            </Typography>
            <Switch
              size="small"
              checked={showYearly}
              onChange={(e) => setShowYearly(e.target.checked)}
              slotProps={{ input: { "aria-label": t("yearlyToggleLabel") } }}
            />
          </Stack>
        </Stack>
      </Box>

      <Stack data-tour="plan-sections" sx={{ gap: "12px" }}>
        {sections.map((section) => {
          const sectionTotal = section.categories.reduce(
            (sum, c) => sum + monthlyTargetAmount(categoryToTargetFields(c)),
            0,
          );
          const sectionColor = section.type === "income" ? tokens.green : tokens.red;
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
                open={openSections[section.id] ?? false}
                onOpenChange={(open) =>
                  setOpenSections((prev) => ({ ...prev, [section.id]: open }))
                }
                label={
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", alignItems: "center", width: "100%" }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 500,
                      }}
                      style={{ color: tokens.textMuted }}
                    >
                      {section.name}
                    </Typography>
                    <Stack direction="row" sx={{ alignItems: "center", gap: "6px" }}>
                      <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                        {t("sectionCategoryCount", { count: section.categories.length })}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11, fontWeight: 600 }}
                        style={{ color: sectionColor }}
                      >
                        {t("perMonth", { amount: money(sectionTotal) })}
                        {showYearly && ` · ${t("perYear", { amount: money(sectionTotal * 12) })}`}
                      </Typography>
                    </Stack>
                  </Stack>
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
                  {section.categories.map((category, i) => {
                    const expanded = expandedId === category.id;
                    return (
                      <Box
                        key={category.id}
                        sx={{
                          borderBottom:
                            i < section.categories.length - 1
                              ? `1px solid ${tokens.divider}`
                              : "none",
                        }}
                      >
                        <Stack
                          direction="row"
                          onClick={() => toggleRow(category.id)}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: "11px 14px",
                            cursor: "pointer",
                            gap: 1,
                          }}
                          style={{
                            backgroundColor: expanded ? `${tokens.blue}0f` : "transparent",
                          }}
                        >
                          <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textBody }}>
                            {category.name}
                          </Typography>
                          <Stack direction="row" sx={{ alignItems: "center", gap: "10px" }}>
                            <Typography
                              sx={{ fontSize: 12, whiteSpace: "nowrap" }}
                              style={{
                                color: category.targetRepeatType ? sectionColor : tokens.textFaint,
                              }}
                            >
                              {goalLabel(category)}
                            </Typography>
                            {expanded ? (
                              <ExpandMoreIcon
                                sx={{ fontSize: 16 }}
                                style={{ color: tokens.textFaint }}
                              />
                            ) : (
                              <ChevronRightIcon
                                sx={{ fontSize: 16 }}
                                style={{ color: tokens.textFaint }}
                              />
                            )}
                          </Stack>
                        </Stack>
                        {expanded && (
                          <Box
                            sx={{
                              px: "14px",
                              pb: "16px",
                              borderTop: `1px solid ${tokens.divider}`,
                            }}
                          >
                            {editingId === category.id
                              ? targetEditor(category)
                              : targetView(category)}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </CollapsibleGroup>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
