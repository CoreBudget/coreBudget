"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { useTokens } from "@/theme";
import { useToast } from "../../_shared/ToastProvider";
import { useServerAction } from "../../_shared/useServerAction";
import ClickableText from "../../_shared/ClickableText";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { evaluateInlineMath } from "@/lib/inlineMath";
import type { EmployerContributionItem, IncomeItem, WithholdingItem } from "@/lib/paycheckCalc";
import { logPaycheckAction, updatePaycheckAction } from "./actions";

export interface PaycheckDraft {
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

export type PaycheckDialogMode = "view" | "edit";

interface EditableLineItem {
  id: string;
  name: string;
  amount: string;
}
interface EditableWithholdingItem extends EditableLineItem {
  isPreTax: boolean;
  calculationType: "manual" | "401k";
  isEditableOnPaycheck: boolean;
}
interface EditableEmployerItem extends EditableLineItem {
  calculationType: "manual" | "401k_match";
  taxable: boolean;
  isEditableOnPaycheck: boolean;
}
interface EditableDraft {
  periodStartDate: string;
  periodEndDate: string;
  grossIncome: string;
  incomeItems: EditableLineItem[];
  withholdingItems: EditableWithholdingItem[];
  employerContributionItems: EditableEmployerItem[];
  federalTaxAmount: string;
  oasdiAmount: string;
  medicareAmount: string;
  stateTaxAmount: string;
}

function newId(): string {
  return crypto.randomUUID();
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

function toEditableDraft(d: PaycheckDraft): EditableDraft {
  return {
    ...d,
    grossIncome: formatAmountForEdit(d.grossIncome),
    incomeItems: d.incomeItems.map((i) => ({ ...i, amount: formatAmountForEdit(i.amount) })),
    withholdingItems: d.withholdingItems.map((w) => ({
      ...w,
      amount: formatAmountForEdit(w.amount),
      isEditableOnPaycheck: w.isEditableOnPaycheck ?? true,
    })),
    employerContributionItems: d.employerContributionItems.map((e) => ({
      ...e,
      amount: formatAmountForEdit(e.amount),
      isEditableOnPaycheck: e.isEditableOnPaycheck ?? true,
    })),
    federalTaxAmount: formatAmountForEdit(d.federalTaxAmount),
    oasdiAmount: formatAmountForEdit(d.oasdiAmount),
    medicareAmount: formatAmountForEdit(d.medicareAmount),
    stateTaxAmount: formatAmountForEdit(d.stateTaxAmount),
  };
}

export default function PaycheckDialog({
  open,
  onClose,
  jobId,
  paycheckId,
  initial,
  initialMode,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  paycheckId: string | null;
  initial: PaycheckDraft;
  initialMode: PaycheckDialogMode;
  locale: string | null;
}) {
  const t = useTranslations("incomeCalculator");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const [draft, setDraft] = useState<EditableDraft>(() => toEditableDraft(initial));
  const [mode, setMode] = useState<PaycheckDialogMode>(paycheckId ? initialMode : "edit");
  const readOnly = mode === "view";

  const money = (amount: string | number) => formatCurrency(amount, locale, "USD");

  const net = useMemo(() => {
    const income =
      Number(draft.grossIncome) + draft.incomeItems.reduce((s, i) => s + Number(i.amount), 0);
    const withholdings = draft.withholdingItems.reduce((s, w) => s + Number(w.amount), 0);
    const employerContributions = draft.employerContributionItems.reduce(
      (s, e) => s + Number(e.amount),
      0,
    );
    const taxes =
      Number(draft.federalTaxAmount) +
      Number(draft.oasdiAmount) +
      Number(draft.medicareAmount) +
      Number(draft.stateTaxAmount);
    return {
      income,
      withholdings,
      employerContributions,
      taxes,
      net: income - withholdings - taxes,
    };
  }, [draft]);

  function handleSave(andNew: boolean) {
    setError(undefined);
    const payload = {
      periodStartDate: draft.periodStartDate,
      periodEndDate: draft.periodEndDate,
      grossIncome: resolveNumberInput(draft.grossIncome),
      incomeItems: draft.incomeItems.map((i) => ({ ...i, amount: resolveNumberInput(i.amount) })),
      withholdingItems: draft.withholdingItems.map((w) => ({
        ...w,
        amount: resolveNumberInput(w.amount),
      })),
      employerContributionItems: draft.employerContributionItems.map((e) => ({
        ...e,
        amount: resolveNumberInput(e.amount),
      })),
      federalTaxAmount: resolveNumberInput(draft.federalTaxAmount),
      oasdiAmount: resolveNumberInput(draft.oasdiAmount),
      medicareAmount: resolveNumberInput(draft.medicareAmount),
      stateTaxAmount: resolveNumberInput(draft.stateTaxAmount),
    };
    run(
      () =>
        paycheckId ? updatePaycheckAction(paycheckId, payload) : logPaycheckAction(jobId, payload),
      () => {
        showToast(t("paycheckSavedToast"), "success");
        router.refresh();
        if (andNew) {
          setDraft(toEditableDraft(initial));
        } else {
          onClose();
        }
      },
      (err) => setError(err),
    );
  }

  function cancelEdit() {
    if (paycheckId) {
      setDraft(toEditableDraft(initial));
      setMode("view");
    } else {
      onClose();
    }
  }

  function staticRow(label: string, amount: number | string) {
    return (
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} style={{ color: tokens.textBody }}>
          {money(amount)}
        </Typography>
      </Stack>
    );
  }

  function itemRow<T extends EditableLineItem & { isEditableOnPaycheck: boolean }>(
    item: T,
    i: number,
    items: T[],
    setItems: (items: T[]) => void,
  ) {
    if (readOnly || !item.isEditableOnPaycheck) {
      return (
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
            {item.name}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
            {!readOnly && !item.isEditableOnPaycheck && (
              <Typography sx={{ fontSize: 10.5 }} style={{ color: tokens.textFaint }}>
                {t("staticOnPaycheckNote")}
              </Typography>
            )}
            <Typography sx={{ fontSize: 12.5, fontWeight: 500 }} style={{ color: tokens.textBody }}>
              {money(resolveNumberInput(item.amount))}
            </Typography>
          </Stack>
        </Stack>
      );
    }
    return (
      <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
        <TextField
          size="small"
          value={item.name}
          aria-label={t("itemNamePlaceholder")}
          onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], name: e.target.value };
            setItems(next);
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          value={item.amount}
          aria-label={t("itemAmountLabel")}
          onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], amount: e.target.value };
            setItems(next);
          }}
          onBlur={(e) => {
            const next = [...items];
            next[i] = { ...next[i], amount: formatAmountForEdit(e.target.value) };
            setItems(next);
          }}
          sx={{ width: 90 }}
          slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
        />
        <IconButton
          size="small"
          onClick={() => setItems(items.filter((_, idx) => idx !== i))}
          aria-label={td(tRoot, "common.delete")}
        >
          <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {!paycheckId
          ? t("logPaycheckTitle")
          : readOnly
            ? t("viewPaycheckTitle")
            : t("editPaycheckTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {readOnly ? (
            <Stack direction="row" sx={{ gap: 3 }}>
              <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                {t("periodStartLabel")}:{" "}
                <span style={{ color: tokens.textBody }}>
                  {formatDateOnly(draft.periodStartDate, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </Typography>
              <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                {t("periodEndLabel")}:{" "}
                <span style={{ color: tokens.textBody }}>
                  {formatDateOnly(draft.periodEndDate, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" sx={{ gap: 2 }}>
              <TextField
                type="date"
                size="small"
                label={t("periodStartLabel")}
                value={draft.periodStartDate}
                onChange={(e) => setDraft({ ...draft, periodStartDate: e.target.value })}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                type="date"
                size="small"
                label={t("periodEndLabel")}
                value={draft.periodEndDate}
                onChange={(e) => setDraft({ ...draft, periodEndDate: e.target.value })}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: "6px" }}>
                {t("incomeCardTitle")}
              </Typography>
              {readOnly ? (
                <Stack sx={{ gap: "6px" }}>
                  {staticRow(t("grossIncomeLabel"), resolveNumberInput(draft.grossIncome))}
                  {draft.incomeItems.map((item) => (
                    <Box key={item.id}>{staticRow(item.name, resolveNumberInput(item.amount))}</Box>
                  ))}
                </Stack>
              ) : (
                <Stack sx={{ gap: "6px" }}>
                  <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
                    <Typography sx={{ fontSize: 12.5, flex: 1 }} style={{ color: tokens.textBody }}>
                      {t("grossIncomeLabel")}
                    </Typography>
                    <TextField
                      size="small"
                      value={draft.grossIncome}
                      aria-label={t("grossIncomeLabel")}
                      onChange={(e) => setDraft({ ...draft, grossIncome: e.target.value })}
                      onBlur={(e) =>
                        setDraft({ ...draft, grossIncome: formatAmountForEdit(e.target.value) })
                      }
                      sx={{ width: 110 }}
                      slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                    />
                  </Stack>
                  {draft.incomeItems.map((item, i) => (
                    <Stack key={item.id} direction="row" sx={{ gap: 1, alignItems: "center" }}>
                      <TextField
                        size="small"
                        value={item.name}
                        aria-label={t("itemNamePlaceholder")}
                        onChange={(e) => {
                          const next = [...draft.incomeItems];
                          next[i] = { ...next[i], name: e.target.value };
                          setDraft({ ...draft, incomeItems: next });
                        }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        value={item.amount}
                        aria-label={t("itemAmountLabel")}
                        onChange={(e) => {
                          const next = [...draft.incomeItems];
                          next[i] = { ...next[i], amount: e.target.value };
                          setDraft({ ...draft, incomeItems: next });
                        }}
                        onBlur={(e) => {
                          const next = [...draft.incomeItems];
                          next[i] = { ...next[i], amount: formatAmountForEdit(e.target.value) };
                          setDraft({ ...draft, incomeItems: next });
                        }}
                        sx={{ width: 90 }}
                        slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            incomeItems: draft.incomeItems.filter((_, idx) => idx !== i),
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
                      setDraft({
                        ...draft,
                        incomeItems: [...draft.incomeItems, { id: newId(), name: "", amount: "" }],
                      })
                    }
                    sx={{ fontSize: 11.5, cursor: "pointer" }}
                    style={{ color: tokens.blue }}
                  >
                    {t("addIncomeItem")}
                  </ClickableText>
                </Stack>
              )}
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: "6px" }}>
                {t("taxesCardTitle")}
              </Typography>
              <Stack sx={{ gap: readOnly ? "6px" : "8px" }}>
                {(
                  [
                    ["federalTaxAmount", t("federalTaxLabel")],
                    ["oasdiAmount", t("oasdiLabel")],
                    ["medicareAmount", t("medicareLabel")],
                    ["stateTaxAmount", t("stateTaxLabel")],
                  ] as const
                ).map(([key, label]) =>
                  readOnly ? (
                    <Box key={key}>{staticRow(label, resolveNumberInput(draft[key]))}</Box>
                  ) : (
                    <Stack key={key} direction="row" sx={{ gap: 1, alignItems: "center" }}>
                      <Typography
                        sx={{ fontSize: 12.5, flex: 1 }}
                        style={{ color: tokens.textBody }}
                      >
                        {label}
                      </Typography>
                      <TextField
                        size="small"
                        value={draft[key]}
                        aria-label={label}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                        onBlur={(e) =>
                          setDraft({ ...draft, [key]: formatAmountForEdit(e.target.value) })
                        }
                        sx={{ width: 110 }}
                        slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                      />
                    </Stack>
                  ),
                )}
              </Stack>
            </Box>

            <Box
              sx={{
                gridColumn: "1 / -1",
                borderTop: `1px solid ${tokens.divider}`,
              }}
            />

            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: "6px" }}>
                {t("withholdingsCardTitle")}
              </Typography>
              <Stack sx={{ gap: "6px" }}>
                {draft.withholdingItems.map((item, i) => (
                  <Box key={item.id}>
                    {itemRow(item, i, draft.withholdingItems, (items) =>
                      setDraft({ ...draft, withholdingItems: items }),
                    )}
                  </Box>
                ))}
                {!readOnly && (
                  <ClickableText
                    onClick={() =>
                      setDraft({
                        ...draft,
                        withholdingItems: [
                          ...draft.withholdingItems,
                          {
                            id: newId(),
                            name: "",
                            amount: "",
                            isPreTax: false,
                            calculationType: "manual",
                            isEditableOnPaycheck: true,
                          },
                        ],
                      })
                    }
                    sx={{ fontSize: 11.5, cursor: "pointer" }}
                    style={{ color: tokens.blue }}
                  >
                    {t("addItem")}
                  </ClickableText>
                )}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: "6px" }}>
                {t("employerCardTitle")}
              </Typography>
              <Stack sx={{ gap: "6px" }}>
                {draft.employerContributionItems.map((item, i) => (
                  <Box key={item.id}>
                    {itemRow(item, i, draft.employerContributionItems, (items) =>
                      setDraft({ ...draft, employerContributionItems: items }),
                    )}
                  </Box>
                ))}
                {!readOnly && (
                  <ClickableText
                    onClick={() =>
                      setDraft({
                        ...draft,
                        employerContributionItems: [
                          ...draft.employerContributionItems,
                          {
                            id: newId(),
                            name: "",
                            amount: "",
                            calculationType: "manual",
                            taxable: false,
                            isEditableOnPaycheck: true,
                          },
                        ],
                      })
                    }
                    sx={{ fontSize: 11.5, cursor: "pointer" }}
                    style={{ color: tokens.blue }}
                  >
                    {t("addItem")}
                  </ClickableText>
                )}
              </Stack>
            </Box>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: { xs: "6px", sm: 1 },
              pt: "10px",
              borderTop: `1px solid ${tokens.divider}`,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ gap: { xs: "4px", sm: 2 }, alignItems: { xs: "stretch", sm: "center" } }}
            >
              {(
                [
                  [t("totalLabel"), net.income, tokens.textFaint],
                  [t("totalTaxesLabel"), net.taxes, tokens.red],
                  [t("totalLabel"), net.withholdings, tokens.red],
                  [t("employerCardTitle"), net.employerContributions, tokens.textFaint],
                ] as const
              ).map(([label, value, color], i) => (
                <Stack
                  key={i}
                  direction="row"
                  sx={{ justifyContent: { xs: "space-between", sm: "flex-start" }, gap: "4px" }}
                >
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {label}:
                  </Typography>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color }}>
                    {money(value)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                pt: { xs: "6px", sm: 0 },
                borderTop: { xs: `1px solid ${tokens.divider}`, sm: "none" },
              }}
            >
              <Typography
                sx={{ fontSize: 13, fontWeight: 700, display: { xs: "block", sm: "none" } }}
                style={{ color: tokens.textBody }}
              >
                {t("netPayLabel")}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }} style={{ color: tokens.green }}>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  {t("netPayLabel")}:{" "}
                </Box>
                {money(net.net)}
              </Typography>
            </Stack>
          </Stack>

          {error && (
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.red }}>
              {td(tRoot, error)}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {readOnly ? (
          <>
            <Button onClick={onClose} sx={{ color: "text.secondary" }}>
              {tRoot("common.close")}
            </Button>
            <Button variant="contained" onClick={() => setMode("edit")}>
              {t("editButton")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={cancelEdit} sx={{ color: "text.secondary" }}>
              {tRoot("common.cancel")}
            </Button>
            {!paycheckId && (
              <Button onClick={() => handleSave(true)} disabled={pending}>
                {t("saveAndNewButton")}
              </Button>
            )}
            <Button onClick={() => handleSave(false)} variant="contained" disabled={pending}>
              {t("saveButton")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
