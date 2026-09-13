"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/EditOutlined";
import AdminButton from "../../admin/_shared/AdminButton";
import { useIsMobile } from "../useIsMobile";
import { useTokens } from "@/theme";
import { useToast } from "../../_shared/ToastProvider";
import ConfirmDialog from "../../_shared/ConfirmDialog";
import ClickableText from "../../_shared/ClickableText";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { evaluateInlineMath } from "@/lib/inlineMath";
import { activateOnEnterOrSpace } from "@/lib/keyboardActivation";
import { useTour } from "../../_shared/tours/useTour";
import {
  computePaycheck,
  payPeriodsPerYear,
  resolveTaxRates,
  type EmployerContributionItem,
  type IncomeItem,
  type WithholdingItem,
} from "@/lib/paycheckCalc";
import type { PayPeriodType } from "@/generated/prisma/client";
import { deletePaycheckAction, logPaycheckAction, saveTemplateAction } from "./actions";
import PaycheckDialog, { type PaycheckDialogMode, type PaycheckDraft } from "./PaycheckDialog";

export interface JobOption {
  id: string;
  name: string;
  payPeriodType: string;
}

export interface TaxRatesProp {
  socialSecurityRate: string | null;
  medicareRate: string | null;
  stateTaxRate: string | null;
}

export interface TemplateProp {
  grossIncome: string;
  incomeItems: IncomeItem[];
  withholdingItems: WithholdingItem[];
  employerContributionItems: EmployerContributionItem[];
  federalTaxAmount: string;
  oasdiAmount: string;
  oasdiCalculationRule: string;
  medicareAmount: string;
  medicareCalculationRule: string;
  stateTaxAmount: string;
  stateTaxCalculationRule: string;
}

export interface PaycheckRow {
  id: string;
  periodStartDate: string;
  periodEndDate: string;
  grossIncome: string;
  incomeItems: IncomeItem[];
  withholdingItems: WithholdingItem[];
  employerContributionItems: EmployerContributionItem[];
  federalTaxAmount: string;
  oasdiAmount: string;
  medicareAmount: string;
  stateTaxAmount: string;
}

interface DraftLineItem {
  id: string;
  name: string;
  amount: string;
}
interface DraftWithholdingItem extends DraftLineItem {
  isPreTax: boolean;
  calculationType: "manual" | "401k";
  isEditableOnPaycheck: boolean;
}
interface DraftEmployerItem extends DraftLineItem {
  calculationType: "manual" | "401k_match";
  taxable: boolean;
  isEditableOnPaycheck: boolean;
}

interface Draft {
  grossIncome: string;
  incomeItems: DraftLineItem[];
  withholdingItems: DraftWithholdingItem[];
  employerContributionItems: DraftEmployerItem[];
  federalTaxAmount: string;
  oasdiAmount: string;
  oasdiCalculationRule: "auto" | "manual";
  medicareAmount: string;
  medicareCalculationRule: "auto" | "manual";
  stateTaxAmount: string;
  stateTaxCalculationRule: "auto" | "manual";
}

function newId(): string {
  return crypto.randomUUID();
}

function emptyDraft(): Draft {
  return {
    grossIncome: "",
    incomeItems: [],
    withholdingItems: [],
    employerContributionItems: [],
    federalTaxAmount: "",
    oasdiAmount: "",
    oasdiCalculationRule: "auto",
    medicareAmount: "",
    medicareCalculationRule: "auto",
    stateTaxAmount: "",
    stateTaxCalculationRule: "auto",
  };
}

function templateToDraft(t: TemplateProp | null): Draft {
  if (!t) return emptyDraft();
  return {
    grossIncome: formatAmountForEdit(t.grossIncome),
    incomeItems: t.incomeItems.map((i) => ({ ...i, amount: formatAmountForEdit(i.amount) })),
    withholdingItems: t.withholdingItems.map((w) => ({
      ...w,
      amount: formatAmountForEdit(w.amount),
      isEditableOnPaycheck: w.isEditableOnPaycheck ?? true,
    })),
    employerContributionItems: t.employerContributionItems.map((e) => ({
      ...e,
      amount: formatAmountForEdit(e.amount),
      isEditableOnPaycheck: e.isEditableOnPaycheck ?? true,
    })),
    federalTaxAmount: formatAmountForEdit(t.federalTaxAmount),
    oasdiAmount: formatAmountForEdit(t.oasdiAmount),
    oasdiCalculationRule: t.oasdiCalculationRule === "manual" ? "manual" : "auto",
    medicareAmount: formatAmountForEdit(t.medicareAmount),
    medicareCalculationRule: t.medicareCalculationRule === "manual" ? "manual" : "auto",
    stateTaxAmount: formatAmountForEdit(t.stateTaxAmount),
    stateTaxCalculationRule: t.stateTaxCalculationRule === "manual" ? "manual" : "auto",
  };
}

function resolveNumberInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9+\-*/().\s]/g, "").trim();
  if (!cleaned) return 0;
  const evaluated = evaluateInlineMath(cleaned);
  if (evaluated !== null) return evaluated;
  const plain = Number(cleaned);
  return Number.isFinite(plain) ? plain : 0;
}

function formatAmountForEdit(amount: string | number): string {
  const n = typeof amount === "number" ? amount : resolveNumberInput(amount);
  return n === 0 ? "" : String(n);
}

export default function IncomeCalculatorPanel({
  locale,
  jobs,
  selectedJobId,
  selectedJobPayPeriodType,
  years,
  selectedYear,
  taxRates,
  template,
  paychecks,
}: {
  locale: string | null;
  jobs: JobOption[];
  selectedJobId: string;
  selectedJobPayPeriodType: string;
  years: number[];
  selectedYear: number;
  taxRates: TaxRatesProp;
  template: TemplateProp | null;
  paychecks: PaycheckRow[];
}) {
  const t = useTranslations("incomeCalculator");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();

  useTour("page:income-calculator", [
    {
      element: '[data-tour="income-calc-cards"]',
      title: t("tour.cards.title"),
      description: t("tour.cards.description"),
      side: "right",
    },
    {
      element: '[data-tour="income-calc-history"]',
      title: t("tour.history.title"),
      description: t("tour.history.description"),
      side: "top",
    },
  ]);
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Draft>(() => templateToDraft(template));
  const [snapshot, setSnapshot] = useState<Draft | null>(null);
  const [paycheckDialogOpen, setPaycheckDialogOpen] = useState(false);
  const [editingPaycheckId, setEditingPaycheckId] = useState<string | null>(null);
  const [paycheckDialogMode, setPaycheckDialogMode] = useState<PaycheckDialogMode>("edit");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [cloneSource, setCloneSource] = useState<PaycheckRow | null>(null);
  const [cloneStart, setCloneStart] = useState("");
  const [cloneEnd, setCloneEnd] = useState("");
  const [clonePending, setClonePending] = useState(false);

  const money = (amount: string | number) => formatCurrency(amount, locale, "USD");

  const resolvedRates = resolveTaxRates({
    socialSecurityRate: taxRates.socialSecurityRate ? Number(taxRates.socialSecurityRate) : null,
    medicareRate: taxRates.medicareRate ? Number(taxRates.medicareRate) : null,
    stateTaxRate: taxRates.stateTaxRate ? Number(taxRates.stateTaxRate) : null,
  });
  const periodsPerYear = payPeriodsPerYear(selectedJobPayPeriodType as PayPeriodType);

  const result = useMemo(
    () =>
      computePaycheck({
        grossIncome: resolveNumberInput(values.grossIncome),
        incomeItems: values.incomeItems.map((i) => ({
          ...i,
          amount: resolveNumberInput(i.amount),
        })),
        withholdingItems: values.withholdingItems.map((w) => ({
          ...w,
          amount: resolveNumberInput(w.amount),
        })),
        employerContributionItems: values.employerContributionItems.map((e) => ({
          ...e,
          amount: resolveNumberInput(e.amount),
        })),
        federalTaxAmount: resolveNumberInput(values.federalTaxAmount),
        oasdiCalculationRule: values.oasdiCalculationRule,
        oasdiAmount: resolveNumberInput(values.oasdiAmount),
        medicareCalculationRule: values.medicareCalculationRule,
        medicareAmount: resolveNumberInput(values.medicareAmount),
        stateTaxCalculationRule: values.stateTaxCalculationRule,
        stateTaxAmount: resolveNumberInput(values.stateTaxAmount),
        taxRates: resolvedRates,
        periodsPerYear,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, periodsPerYear],
  );

  function startEdit() {
    setSnapshot(values);
    setEditing(true);
  }

  function cancelEdit() {
    if (snapshot) setValues(snapshot);
    setEditing(false);
  }

  function saveTemplate() {
    const payload = {
      grossIncome: resolveNumberInput(values.grossIncome),
      incomeItems: values.incomeItems.map((i) => ({ ...i, amount: resolveNumberInput(i.amount) })),
      withholdingItems: values.withholdingItems.map((w) => ({
        ...w,
        amount: resolveNumberInput(w.amount),
      })),
      employerContributionItems: values.employerContributionItems.map((e) => ({
        ...e,
        amount: resolveNumberInput(e.amount),
      })),
      federalTaxAmount: resolveNumberInput(values.federalTaxAmount),
      oasdiAmount: resolveNumberInput(values.oasdiAmount),
      oasdiCalculationRule: values.oasdiCalculationRule,
      medicareAmount: resolveNumberInput(values.medicareAmount),
      medicareCalculationRule: values.medicareCalculationRule,
      stateTaxAmount: resolveNumberInput(values.stateTaxAmount),
      stateTaxCalculationRule: values.stateTaxCalculationRule,
    };
    startTransition(async () => {
      const res = await saveTemplateAction(selectedJobId, payload);
      if (res.error) {
        showToast(td(tRoot, res.error), "error");
        return;
      }
      setEditing(false);
      showToast(t("templateSavedToast"), "success");
      router.refresh();
    });
  }

  function goToJob(jobId: string) {
    return `/income-calculator?job=${jobId}&year=${selectedYear}`;
  }

  function goToYear(year: number) {
    return `/income-calculator?job=${selectedJobId}&year=${year}`;
  }

  function paycheckPrefill(): PaycheckDraft {
    const start = new Date();
    const end = new Date(start.getTime() + (365 / periodsPerYear) * 86400000);
    return {
      periodStartDate: start.toISOString().slice(0, 10),
      periodEndDate: end.toISOString().slice(0, 10),
      grossIncome: values.grossIncome,
      incomeItems: values.incomeItems.map((i) => ({ ...i, amount: resolveNumberInput(i.amount) })),
      withholdingItems: values.withholdingItems.map((w) => ({
        ...w,
        amount: resolveNumberInput(w.amount),
      })),
      employerContributionItems: values.employerContributionItems.map((e) => ({
        ...e,
        amount: resolveNumberInput(e.amount),
      })),
      federalTaxAmount: String(result.federalTaxAmount),
      oasdiAmount: String(result.oasdiAmount.toFixed(2)),
      medicareAmount: String(result.medicareAmount.toFixed(2)),
      stateTaxAmount: String(result.stateTaxAmount.toFixed(2)),
    };
  }

  function viewPaycheck(p: PaycheckRow) {
    setEditingPaycheckId(p.id);
    setPaycheckDialogMode("view");
    setPaycheckDialogOpen(true);
  }

  function editPaycheck(p: PaycheckRow) {
    setEditingPaycheckId(p.id);
    setPaycheckDialogMode("edit");
    setPaycheckDialogOpen(true);
  }

  function openCloneDialog(p: PaycheckRow) {
    setCloneSource(p);
    setCloneStart(p.periodStartDate);
    setCloneEnd(p.periodEndDate);
  }

  function submitClone() {
    if (!cloneSource) return;
    setClonePending(true);
    (async () => {
      const res = await logPaycheckAction(selectedJobId, {
        periodStartDate: cloneStart,
        periodEndDate: cloneEnd,
        grossIncome: Number(cloneSource.grossIncome),
        incomeItems: cloneSource.incomeItems,
        withholdingItems: cloneSource.withholdingItems,
        employerContributionItems: cloneSource.employerContributionItems,
        federalTaxAmount: Number(cloneSource.federalTaxAmount),
        oasdiAmount: Number(cloneSource.oasdiAmount),
        medicareAmount: Number(cloneSource.medicareAmount),
        stateTaxAmount: Number(cloneSource.stateTaxAmount),
      });
      setClonePending(false);
      if (res.error) {
        showToast(td(tRoot, res.error), "error");
        return;
      }
      showToast(t("paycheckSavedToast"), "success");
      setCloneSource(null);
      router.refresh();
    })();
  }

  const editingPaycheck = paychecks.find((p) => p.id === editingPaycheckId) ?? null;

  const rowSx = {
    border: `1px solid ${tokens.border}`,
    borderRadius: "10px",
    p: "12px 14px",
  };

  function lineRowsView(
    items: { id: string; name: string; amount: number | string }[],
    total: number,
  ) {
    return (
      <Stack sx={{ gap: "6px" }}>
        {items.map((item) => (
          <Stack key={item.id} direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
              {item.name}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} style={{ color: tokens.textBody }}>
              {money(item.amount)}
            </Typography>
          </Stack>
        ))}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            pt: "8px",
            mt: "4px",
            borderTop: `1px solid ${tokens.divider}`,
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} style={{ color: tokens.textBody }}>
            {t("totalLabel")}
          </Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} style={{ color: tokens.textBody }}>
            {money(total)}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  const incomeCard = (
    <Box
      data-tour="income-calc-cards"
      sx={rowSx}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {t("incomeCardTitle")}
      </Typography>
      {editing ? (
        <Stack sx={{ gap: "8px" }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 12.5, flex: 1 }} style={{ color: tokens.textBody }}>
              {t("grossIncomeLabel")}
            </Typography>
            <TextField
              size="small"
              value={values.grossIncome}
              aria-label={t("grossIncomeLabel")}
              onChange={(e) => setValues({ ...values, grossIncome: e.target.value })}
              onBlur={(e) =>
                setValues({ ...values, grossIncome: formatAmountForEdit(e.target.value) })
              }
              sx={{ width: 120 }}
              slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
            />
          </Stack>
          {values.incomeItems.map((item, i) => (
            <Stack key={item.id} direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <TextField
                size="small"
                placeholder={t("itemNamePlaceholder")}
                aria-label={t("itemNamePlaceholder")}
                value={item.name}
                onChange={(e) => {
                  const next = [...values.incomeItems];
                  next[i] = { ...next[i], name: e.target.value };
                  setValues({ ...values, incomeItems: next });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                value={item.amount}
                aria-label={t("itemAmountLabel")}
                onChange={(e) => {
                  const next = [...values.incomeItems];
                  next[i] = { ...next[i], amount: e.target.value };
                  setValues({ ...values, incomeItems: next });
                }}
                onBlur={(e) => {
                  const next = [...values.incomeItems];
                  next[i] = { ...next[i], amount: formatAmountForEdit(e.target.value) };
                  setValues({ ...values, incomeItems: next });
                }}
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
              />
              <IconButton
                size="small"
                onClick={() =>
                  setValues({
                    ...values,
                    incomeItems: values.incomeItems.filter((_, idx) => idx !== i),
                  })
                }
                aria-label={td(tRoot, "common.delete")}
              >
                <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
              </IconButton>
            </Stack>
          ))}
          <ClickableText
            onClick={() =>
              setValues({
                ...values,
                incomeItems: [...values.incomeItems, { id: newId(), name: "", amount: "" }],
              })
            }
            sx={{ fontSize: 11.5, cursor: "pointer" }}
            style={{ color: tokens.blue }}
          >
            {t("addIncomeItem")}
          </ClickableText>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              pt: "8px",
              mt: "4px",
              borderTop: `1px solid ${tokens.divider}`,
            }}
          >
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} style={{ color: tokens.textBody }}>
              {t("totalLabel")}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} style={{ color: tokens.textBody }}>
              {money(result.totalIncomePerPeriod)}
            </Typography>
          </Stack>
        </Stack>
      ) : (
        lineRowsView(
          [
            { id: "gross", name: t("grossIncomeLabel"), amount: Number(values.grossIncome) },
            ...values.incomeItems,
          ],
          result.totalIncomePerPeriod,
        )
      )}
    </Box>
  );

  function totalDetailRow(label: string, base: number, ratePct: number, amount: number) {
    return (
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
          {label}
        </Typography>
        <Stack direction="row" sx={{ gap: "6px", alignItems: "baseline" }}>
          <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
            {money(base)} × {ratePct.toFixed(2)}%
          </Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} style={{ color: tokens.textBody }}>
            {money(amount)}
          </Typography>
        </Stack>
      </Stack>
    );
  }

  const ficaBaseDisplay = Math.max(
    0,
    result.totalIncomePerPeriod -
      values.withholdingItems
        .filter((w) => w.calculationType !== "401k" && w.isPreTax)
        .reduce((s, w) => s + Number(w.amount), 0) +
      values.employerContributionItems
        .filter((e) => e.taxable)
        .reduce((s, e) => s + Number(e.amount), 0),
  );
  const stateBaseDisplay = Math.max(0, ficaBaseDisplay - result.employee401kPerPeriod);

  const taxesCard = (
    <Box sx={rowSx} style={{ backgroundColor: tokens.cardBackground }}>
      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {t("taxesCardTitle")}
      </Typography>
      <Stack sx={{ gap: "10px" }}>
        {(
          [
            [
              "oasdi",
              t("oasdiLabel"),
              ficaBaseDisplay,
              resolvedRates.socialSecurityRate,
              result.oasdiAmount,
              values.oasdiCalculationRule,
              values.oasdiAmount,
              "oasdiCalculationRule" as const,
              "oasdiAmount" as const,
            ],
            [
              "medicare",
              t("medicareLabel"),
              ficaBaseDisplay,
              resolvedRates.medicareRate,
              result.medicareAmount,
              values.medicareCalculationRule,
              values.medicareAmount,
              "medicareCalculationRule" as const,
              "medicareAmount" as const,
            ],
            [
              "state",
              t("stateTaxLabel"),
              stateBaseDisplay,
              resolvedRates.stateTaxRate,
              result.stateTaxAmount,
              values.stateTaxCalculationRule,
              values.stateTaxAmount,
              "stateTaxCalculationRule" as const,
              "stateTaxAmount" as const,
            ],
          ] as const
        ).map(
          ([key, label, base, ratePct, computedAmount, rule, manualAmount, ruleKey, amountKey]) =>
            editing ? (
              <Stack key={key} sx={{ gap: "4px" }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", alignItems: "center" }}
                >
                  <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                    {label}
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
                    <TextField
                      select
                      size="small"
                      value={rule}
                      aria-label={t("calculationModeLabel", { label })}
                      onChange={(e) =>
                        setValues({ ...values, [ruleKey]: e.target.value as "auto" | "manual" })
                      }
                      sx={{ width: 100 }}
                    >
                      <MenuItem value="auto">{t("autoOption")}</MenuItem>
                      <MenuItem value="manual">{t("manualOption")}</MenuItem>
                    </TextField>
                    {rule === "manual" ? (
                      <TextField
                        size="small"
                        value={manualAmount}
                        aria-label={t("manualAmountLabel", { label })}
                        onChange={(e) => setValues({ ...values, [amountKey]: e.target.value })}
                        onBlur={(e) =>
                          setValues({
                            ...values,
                            [amountKey]: formatAmountForEdit(e.target.value),
                          })
                        }
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                      />
                    ) : (
                      <Typography
                        sx={{ fontSize: 12.5, fontWeight: 500, width: 90, textAlign: "right" }}
                        style={{ color: tokens.textBody }}
                      >
                        {money(computedAmount)}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            ) : (
              <Box key={key}>{totalDetailRow(label, base, ratePct, computedAmount)}</Box>
            ),
        )}
        {editing ? (
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
              {t("federalTaxLabel")}
            </Typography>
            <TextField
              size="small"
              value={values.federalTaxAmount}
              aria-label={t("federalTaxLabel")}
              onChange={(e) => setValues({ ...values, federalTaxAmount: e.target.value })}
              onBlur={(e) =>
                setValues({
                  ...values,
                  federalTaxAmount: formatAmountForEdit(e.target.value),
                })
              }
              sx={{ width: 90 }}
              slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
            />
          </Stack>
        ) : (
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
              {t("federalTaxLabel")}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} style={{ color: tokens.textBody }}>
              {money(result.federalTaxAmount)}
            </Typography>
          </Stack>
        )}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            pt: "8px",
            mt: "2px",
            borderTop: `1px solid ${tokens.divider}`,
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} style={{ color: tokens.textBody }}>
            {t("totalTaxesLabel")}
          </Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} style={{ color: tokens.red }}>
            {money(result.totalTaxesPerPeriod)}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );

  function dynamicListCard<T extends { id: string; name: string; amount: string }>(
    title: string,
    items: T[],
    onChange: (items: T[]) => void,
    extraFields: (item: T, i: number, setItem: (patch: Partial<T>) => void) => React.ReactNode,
    blank: () => T,
  ) {
    const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return (
      <Box sx={rowSx} style={{ backgroundColor: tokens.cardBackground }}>
        <Typography
          sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
          style={{ color: tokens.textBody }}
        >
          {title}
        </Typography>
        {editing ? (
          <Stack sx={{ gap: "8px" }}>
            {items.map((item, i) => (
              <Stack key={item.id} sx={{ gap: "6px" }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <TextField
                    size="small"
                    placeholder={t("itemNamePlaceholder")}
                    aria-label={t("itemNamePlaceholder")}
                    value={item.name}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], name: e.target.value };
                      onChange(next);
                    }}
                    sx={{ flex: "1 1 120px" }}
                  />
                  <TextField
                    size="small"
                    value={item.amount}
                    aria-label={t("itemAmountLabel")}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], amount: e.target.value };
                      onChange(next);
                    }}
                    onBlur={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], amount: formatAmountForEdit(e.target.value) };
                      onChange(next);
                    }}
                    sx={{ width: 90 }}
                    slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                    aria-label={td(tRoot, "common.delete")}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
                  </IconButton>
                </Stack>
                {extraFields(item, i, (patch) => {
                  const next = [...items];
                  next[i] = { ...next[i], ...patch };
                  onChange(next);
                })}
              </Stack>
            ))}
            <ClickableText
              onClick={() => onChange([...items, blank()])}
              sx={{ fontSize: 11.5, cursor: "pointer" }}
              style={{ color: tokens.blue }}
            >
              {t("addItem")}
            </ClickableText>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                pt: "8px",
                mt: "4px",
                borderTop: `1px solid ${tokens.divider}`,
              }}
            >
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 700 }}
                style={{ color: tokens.textBody }}
              >
                {t("totalLabel")}
              </Typography>
              <Typography
                sx={{ fontSize: 12.5, fontWeight: 700 }}
                style={{ color: tokens.textBody }}
              >
                {money(total)}
              </Typography>
            </Stack>
          </Stack>
        ) : (
          lineRowsView(items, total)
        )}
      </Box>
    );
  }

  const withholdingsCard = dynamicListCard<DraftWithholdingItem>(
    t("withholdingsCardTitle"),
    values.withholdingItems,
    (items) => setValues({ ...values, withholdingItems: items }),
    (item, _i, setItem) => (
      <Stack direction="row" sx={{ alignItems: "center", gap: 2, pl: "2px" }}>
        <TextField
          select
          size="small"
          value={item.calculationType}
          aria-label={t("calculationTypeLabel")}
          onChange={(e) => setItem({ calculationType: e.target.value as "manual" | "401k" })}
          sx={{ width: 110 }}
        >
          <MenuItem value="manual">{t("manualOption")}</MenuItem>
          <MenuItem value="401k">{t("fourOhOneKOption")}</MenuItem>
        </TextField>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={item.isPreTax}
              onChange={(e) => setItem({ isPreTax: e.target.checked })}
            />
          }
          label={<Typography sx={{ fontSize: 11.5 }}>{t("preTaxLabel")}</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={item.isEditableOnPaycheck}
              onChange={(e) => setItem({ isEditableOnPaycheck: e.target.checked })}
            />
          }
          label={<Typography sx={{ fontSize: 11.5 }}>{t("editableOnPaycheckLabel")}</Typography>}
        />
      </Stack>
    ),
    () => ({
      id: newId(),
      name: "",
      amount: "",
      isPreTax: false,
      calculationType: "manual",
      isEditableOnPaycheck: true,
    }),
  );

  const employerCard = dynamicListCard<DraftEmployerItem>(
    t("employerCardTitle"),
    values.employerContributionItems,
    (items) => setValues({ ...values, employerContributionItems: items }),
    (item, _i, setItem) => (
      <Stack direction="row" sx={{ alignItems: "center", gap: 2, pl: "2px" }}>
        <TextField
          select
          size="small"
          value={item.calculationType}
          aria-label={t("calculationTypeLabel")}
          onChange={(e) => setItem({ calculationType: e.target.value as "manual" | "401k_match" })}
          sx={{ width: 130 }}
        >
          <MenuItem value="manual">{t("manualOption")}</MenuItem>
          <MenuItem value="401k_match">{t("fourOhOneKMatchOption")}</MenuItem>
        </TextField>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={item.taxable}
              onChange={(e) => setItem({ taxable: e.target.checked })}
            />
          }
          label={<Typography sx={{ fontSize: 11.5 }}>{t("taxableLabel")}</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={item.isEditableOnPaycheck}
              onChange={(e) => setItem({ isEditableOnPaycheck: e.target.checked })}
            />
          }
          label={<Typography sx={{ fontSize: 11.5 }}>{t("editableOnPaycheckLabel")}</Typography>}
        />
      </Stack>
    ),
    () => ({
      id: newId(),
      name: "",
      amount: "",
      calculationType: "manual",
      taxable: false,
      isEditableOnPaycheck: true,
    }),
  );

  function summaryTile(label: string, value: number, color?: string, bold = true) {
    return (
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
          {label}
        </Typography>
        <Typography
          sx={{ fontSize: 12.5, fontWeight: bold ? 700 : 500 }}
          style={{ color: color ?? tokens.textBody }}
        >
          {money(value)}
        </Typography>
      </Stack>
    );
  }

  function summaryCard(title: string, children: React.ReactNode) {
    return (
      <Box sx={rowSx} style={{ backgroundColor: tokens.cardBackground }}>
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 600, mb: "8px" }}
          style={{ color: tokens.textBody }}
        >
          {title}
        </Typography>
        <Stack sx={{ gap: "6px" }}>{children}</Stack>
      </Box>
    );
  }

  const incomeRowsPerYear = [
    {
      label: t("grossIncomeLabel"),
      amount: resolveNumberInput(values.grossIncome) * periodsPerYear,
    },
    ...values.incomeItems.map((i) => ({
      label: i.name || t("itemNamePlaceholder"),
      amount: resolveNumberInput(i.amount) * periodsPerYear,
    })),
  ];
  const employerContributionsPerYear = result.totalEmployerContributionsPerPeriod * periodsPerYear;
  const withholdingsPerYear = result.totalWithholdingsPerPeriod * periodsPerYear;

  const rightCol = (
    <Stack sx={{ gap: "12px" }}>
      {summaryCard(
        t("totalCompensationTitle"),
        <>
          {incomeRowsPerYear.map((row, i) => (
            <Box key={i}>{summaryTile(row.label, row.amount, undefined, false)}</Box>
          ))}
          {summaryTile(t("employerCardTitle"), employerContributionsPerYear, undefined, false)}
          <Stack sx={{ pt: "6px", mt: "2px", borderTop: `1px solid ${tokens.divider}` }}>
            {summaryTile(t("totalLabel"), result.totalCompensationPerYear, tokens.green)}
          </Stack>
        </>,
      )}
      {summaryCard(
        t("grossSummaryTitle"),
        <>
          {incomeRowsPerYear.map((row, i) => (
            <Box key={i}>{summaryTile(row.label, row.amount, undefined, false)}</Box>
          ))}
          {summaryTile(t("taxesCardTitle"), result.yearlyTaxesTotal, undefined, false)}
          {summaryTile(t("withholdingsCardTitle"), withholdingsPerYear, undefined, false)}
          <Stack sx={{ pt: "6px", mt: "2px", borderTop: `1px solid ${tokens.divider}` }}>
            {summaryTile(t("netIncomePerYearLabel"), result.grossSummaryNetPerYear, tokens.green)}
          </Stack>
        </>,
      )}
      {summaryCard(
        t("perPayPeriodTitle"),
        summaryTile(t("netPayLabel"), result.netPayPerPeriod, tokens.green),
      )}
      {summaryCard(
        t("perMonthTitle"),
        summaryTile(t("netPayLabel"), result.netPayPerMonth, tokens.green),
      )}
      {summaryCard(
        t("fourOhOneKTotalsTitle"),
        <>
          {summaryTile(t("perPayPeriodLabel"), result.total401kPerPeriod, undefined, false)}
          {summaryTile(t("perMonthLabel"), result.total401kPerMonth, undefined, false)}
          {summaryTile(t("perYearLabel"), result.total401kPerYear)}
        </>,
      )}
      {summaryCard(
        t("yearlyTaxesTitle"),
        <>
          {summaryTile(t("oasdiLabel"), result.oasdiAmount * periodsPerYear, undefined, false)}
          {summaryTile(
            t("medicareLabel"),
            result.medicareAmount * periodsPerYear,
            undefined,
            false,
          )}
          {summaryTile(
            t("stateTaxLabel"),
            result.stateTaxAmount * periodsPerYear,
            undefined,
            false,
          )}
          {summaryTile(
            t("federalTaxLabel"),
            result.federalTaxAmount * periodsPerYear,
            undefined,
            false,
          )}
          <Stack sx={{ pt: "6px", mt: "2px", borderTop: `1px solid ${tokens.divider}` }}>
            {summaryTile(t("totalLabel"), result.yearlyTaxesTotal, tokens.red)}
          </Stack>
        </>,
      )}
      {summaryCard(
        t("yearlyEmployerContributionsTitle"),
        <>
          {values.employerContributionItems.map((e) => (
            <Box key={e.id}>
              {summaryTile(
                e.name || t("itemNamePlaceholder"),
                resolveNumberInput(e.amount) * periodsPerYear,
                undefined,
                false,
              )}
            </Box>
          ))}
          <Stack sx={{ pt: "6px", mt: "2px", borderTop: `1px solid ${tokens.divider}` }}>
            {summaryTile(t("totalLabel"), employerContributionsPerYear)}
          </Stack>
        </>,
      )}
    </Stack>
  );

  const openLogPaycheck = () => {
    setEditingPaycheckId(null);
    setPaycheckDialogMode("edit");
    setPaycheckDialogOpen(true);
  };

  const actionButtons = (
    <Stack direction="row" sx={{ gap: 1, flex: "none" }}>
      {editing ? (
        <>
          <AdminButton onClick={cancelEdit}>{tRoot("common.cancel")}</AdminButton>
          <AdminButton variant="contained" disabled={pending} onClick={saveTemplate}>
            {t("saveTemplateButton")}
          </AdminButton>
        </>
      ) : (
        <>
          <AdminButton onClick={openLogPaycheck}>{t("logPaycheckButton")}</AdminButton>
          <AdminButton variant="contained" onClick={startEdit}>
            {t("editButton")}
          </AdminButton>
        </>
      )}
    </Stack>
  );

  const mobileActionButtons = (
    <Stack direction="row" sx={{ gap: 1, flex: "none" }}>
      {editing ? (
        <>
          <AdminButton onClick={cancelEdit}>{tRoot("common.cancel")}</AdminButton>
          <AdminButton variant="contained" disabled={pending} onClick={saveTemplate}>
            {t("saveTemplateButton")}
          </AdminButton>
        </>
      ) : (
        <AdminButton variant="contained" onClick={startEdit}>
          {t("editButton")}
        </AdminButton>
      )}
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: "10px",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
            style={{ color: tokens.textPrimary }}
          >
            {t("title")}
          </Typography>
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("subtitle")}
          </Typography>
        </Box>
        {!isMobile && actionButtons}
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: "16px" }}
      >
        <Stack
          direction="row"
          sx={{
            gap: 1,
            alignItems: "center",
            flexWrap: isMobile ? "nowrap" : "wrap",
            overflowX: isMobile ? "auto" : "visible",
            minWidth: 0,
          }}
        >
          {jobs.map((job) => (
            <Link key={job.id} href={goToJob(job.id)} style={{ textDecoration: "none" }}>
              <Box
                sx={{
                  px: "12px",
                  py: "6px",
                  borderRadius: "8px",
                  border: `1px solid ${tokens.border}`,
                  flex: "none",
                  whiteSpace: "nowrap",
                }}
                style={{
                  backgroundColor:
                    job.id === selectedJobId ? tokens.hoverBackgroundStrong : tokens.cardBackground,
                  color: job.id === selectedJobId ? tokens.textBody : tokens.textFaint,
                }}
              >
                <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>{job.name}</Typography>
              </Box>
            </Link>
          ))}
          <Link href="/settings/jobs" style={{ textDecoration: "none", flex: "none" }}>
            <Typography sx={{ fontSize: 12, whiteSpace: "nowrap" }} style={{ color: tokens.blue }}>
              {t("manageJobsLink")}
            </Typography>
          </Link>
        </Stack>
        {isMobile && mobileActionButtons}
      </Stack>

      {isMobile && !editing && (
        <Box
          component="button"
          onClick={openLogPaycheck}
          aria-label={t("logPaycheckButton")}
          sx={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 22,
            boxShadow: tokens.menuShadow,
          }}
          style={{ backgroundColor: tokens.blue, color: tokens.blueContrast }}
        >
          <AddIcon sx={{ fontSize: 26 }} />
        </Box>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: "14px", alignItems: "flex-start" }}>
        <Stack sx={{ gap: "14px", flex: "1.6 1 0", width: "100%" }}>
          {incomeCard}
          {taxesCard}
          {withholdingsCard}
          {employerCard}
        </Stack>
        <Box sx={{ flex: "1 1 0", width: "100%" }}>{rightCol}</Box>
      </Stack>

      <Box data-tour="income-calc-history" sx={{ mt: "20px" }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: "10px", gap: 1 }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700 }} style={{ color: tokens.textBody }}>
            {t("paycheckHistoryTitle")}
          </Typography>
          <TextField
            select
            size="small"
            value={selectedYear}
            aria-label={t("yearLabel")}
            onChange={(e) => router.push(goToYear(Number(e.target.value)))}
            sx={{ width: 100 }}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {paychecks.length === 0 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("paycheckHistoryEmptyForYear", { year: selectedYear })}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: "8px",
            }}
          >
            {paychecks.map((p) => {
              const net =
                Number(p.grossIncome) +
                p.incomeItems.reduce((s, i) => s + Number(i.amount), 0) -
                p.withholdingItems.reduce((s, w) => s + Number(w.amount), 0) -
                (Number(p.federalTaxAmount) +
                  Number(p.oasdiAmount) +
                  Number(p.medicareAmount) +
                  Number(p.stateTaxAmount));
              const dateLabel = (
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                  {formatDateOnly(p.periodStartDate, { month: "short", day: "numeric" })} –{" "}
                  {formatDateOnly(p.periodEndDate, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Typography>
              );
              const grossNet = (
                <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                    {t("grossIncomeLabel")}: {money(p.grossIncome)}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, fontWeight: 700 }}
                    style={{ color: tokens.green }}
                  >
                    {money(net)}
                  </Typography>
                </Stack>
              );
              const icons = (
                <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, flex: "none" }}>
                  <IconButton
                    size="small"
                    title={t("editButton")}
                    onClick={(e) => {
                      e.stopPropagation();
                      editPaycheck(p);
                    }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    title={t("cloneButton")}
                    onClick={(e) => {
                      e.stopPropagation();
                      openCloneDialog(p);
                    }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    title={tRoot("common.delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(p.id);
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.red }} />
                  </IconButton>
                </Stack>
              );

              return (
                <Box
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  sx={{
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    p: "10px 12px",
                    cursor: "pointer",
                  }}
                  style={{ backgroundColor: tokens.cardBackground }}
                  onClick={() => viewPaycheck(p)}
                  onKeyDown={activateOnEnterOrSpace(() => viewPaycheck(p))}
                >
                  {isMobile ? (
                    <Stack sx={{ gap: "6px" }}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
                      >
                        {dateLabel}
                        {icons}
                      </Stack>
                      {grossNet}
                    </Stack>
                  ) : (
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        rowGap: "6px",
                      }}
                    >
                      {dateLabel}
                      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                        {grossNet}
                        {icons}
                      </Stack>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <PaycheckDialog
        key={`${editingPaycheckId ?? "new"}-${paycheckDialogMode}-${paycheckDialogOpen}`}
        open={paycheckDialogOpen}
        onClose={() => {
          setPaycheckDialogOpen(false);
          setEditingPaycheckId(null);
        }}
        jobId={selectedJobId}
        paycheckId={editingPaycheckId}
        initial={editingPaycheck ? editingPaycheck : paycheckPrefill()}
        initialMode={paycheckDialogMode}
        locale={locale}
      />

      <Dialog
        open={cloneSource !== null}
        onClose={() => setCloneSource(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t("clonePaycheckTitle")}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <TextField
              type="date"
              size="small"
              label={t("periodStartLabel")}
              value={cloneStart}
              onChange={(e) => setCloneStart(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="date"
              size="small"
              label={t("periodEndLabel")}
              value={cloneEnd}
              onChange={(e) => setCloneEnd(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCloneSource(null)} sx={{ color: "text.secondary" }}>
            {tRoot("common.cancel")}
          </Button>
          <Button variant="contained" onClick={submitClone} disabled={clonePending}>
            {t("cloneButton")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t("deletePaycheckConfirm.title")}
        description={t("deletePaycheckConfirm.description")}
        confirmLabel={tRoot("common.delete")}
        cancelLabel={tRoot("common.cancel")}
        onConfirm={() => {
          const id = deleteTargetId;
          setDeleteTargetId(null);
          if (!id) return;
          startTransition(async () => {
            const res = await deletePaycheckAction(id);
            if (res.error) showToast(td(tRoot, res.error), "error");
            router.refresh();
          });
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}
