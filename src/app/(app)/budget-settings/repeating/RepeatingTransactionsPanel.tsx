"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import AdminButton from "../../../admin/_shared/AdminButton";
import AddIcon from "@mui/icons-material/Add";
import { useTokens } from "@/theme";
import { useIsMobile } from "../../useIsMobile";
import { useToast } from "../../../_shared/ToastProvider";
import { useServerAction } from "../../../_shared/useServerAction";
import ConfirmDialog from "../../../_shared/ConfirmDialog";
import ClickableText from "../../../_shared/ClickableText";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { parseAmountInput, stripAmountFormatting } from "@/lib/amount";
import { td } from "@/lib/i18n/translateDynamicKey";
import {
  createRepeatingTransactionAction,
  deleteRepeatingTransactionAction,
  toggleActiveRepeatingTransactionAction,
  updateNextOccurrenceDateAction,
  updateRepeatingTransactionAction,
} from "./actions";
import { CADENCE_OPTIONS, repeatTypeToCadence, type CadenceOption } from "./cadence";
import type { AccountOption, SectionOption } from "../../_shared/budgetPickerTypes";

const ACTIONS_COLUMN_WIDTH = 100;

interface RepeatingSplitRow {
  id: string;
  categoryId: string;
  categoryName: string;
  memo: string | null;
  debit: string | null;
  credit: string | null;
}

export interface RepeatingTransactionRow {
  id: string;
  accountId: string;
  accountName: string;
  payeeName: string;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  debit: string | null;
  credit: string | null;
  repeatType: string;
  intervalWeeks: number | null;
  nextOccurrenceDate: string;
  isActive: boolean;
  hasHistory: boolean;
  isSubscriptionLinked: boolean;
  isSplit: boolean;
  splits: RepeatingSplitRow[];
}

interface SplitDraft {
  categoryId: string;
  memo: string;
  debit: string;
  credit: string;
}

interface DraftState {
  accountId: string;
  payeeName: string;
  categoryId: string;
  memo: string;
  debit: string;
  credit: string;
  cadence: CadenceOption;
  nextOccurrenceDate: string;
  isSplitMode: boolean;
  splits: SplitDraft[];
}

function emptySplitDraft(): SplitDraft {
  return { categoryId: "", memo: "", debit: "", credit: "" };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(accounts: AccountOption[]): DraftState {
  return {
    accountId: accounts[0]?.id ?? "",
    payeeName: "",
    categoryId: "",
    memo: "",
    debit: "",
    credit: "",
    cadence: "monthly",
    nextOccurrenceDate: today(),
    isSplitMode: false,
    splits: [],
  };
}

function draftFromRow(row: RepeatingTransactionRow): DraftState {
  return {
    accountId: row.accountId,
    payeeName: row.payeeName,
    categoryId: row.categoryId ?? "",
    memo: row.memo ?? "",
    debit: row.debit ?? "",
    credit: row.credit ?? "",
    cadence: repeatTypeToCadence(row.repeatType as never, row.intervalWeeks),
    nextOccurrenceDate: row.nextOccurrenceDate.slice(0, 10),
    isSplitMode: row.isSplit,
    splits: row.isSplit
      ? row.splits.map((s) => ({
          categoryId: s.categoryId,
          memo: s.memo ?? "",
          debit: s.debit ?? "",
          credit: s.credit ?? "",
        }))
      : [],
  };
}

interface CategoryChoice {
  id: string;
  name: string;
  group: string;
}

function buildCategoryOptions(
  sections: SectionOption[],
  uncategorizedLabel: string,
): CategoryChoice[] {
  return [
    { id: "", name: uncategorizedLabel, group: "" },
    ...sections.flatMap((s) =>
      s.categories.map((c) => ({ id: c.id, name: c.name, group: s.name })),
    ),
  ];
}

function validateDraft(draft: DraftState): string | null {
  const debit = parseAmountInput(draft.debit) || 0;
  const credit = parseAmountInput(draft.credit) || 0;
  if (debit && credit) return "transactions.errors.onlyOneAmount";
  if (!debit && !credit) return "transactions.errors.amountRequired";
  if (!draft.payeeName.trim()) return "transactions.errors.payeeRequired";
  if (!draft.accountId) return "budgetSettings.repeating.errors.accountRequired";

  if (draft.isSplitMode) {
    const active = draft.splits.filter(
      (s) => parseAmountInput(s.debit) || parseAmountInput(s.credit),
    );
    if (active.length === 0) return "transactions.errors.addAtLeastOneSplit";
    if (active.some((s) => !s.categoryId)) return "transactions.errors.splitCategoryRequired";
    const splitNet = active.reduce(
      (sum, s) => sum + (parseAmountInput(s.debit) || 0) - (parseAmountInput(s.credit) || 0),
      0,
    );
    const parentNet = debit - credit;
    if (Math.abs(splitNet - parentNet) > 0.005) return "transactions.errors.splitsMismatch";
  }

  return null;
}

function draftToFormData(draft: DraftState): FormData {
  const fd = new FormData();
  fd.set("accountId", draft.accountId);
  fd.set("payeeName", draft.payeeName);
  fd.set("categoryId", draft.categoryId);
  fd.set("memo", draft.memo);
  fd.set("debit", stripAmountFormatting(draft.debit) || "0");
  fd.set("credit", stripAmountFormatting(draft.credit) || "0");
  fd.set("cadence", draft.cadence);
  fd.set("nextOccurrenceDate", draft.nextOccurrenceDate);
  if (draft.isSplitMode) {
    const active = draft.splits.filter(
      (s) => parseAmountInput(s.debit) || parseAmountInput(s.credit),
    );
    fd.set(
      "splitsJson",
      JSON.stringify(
        active.map((s) => ({
          categoryId: s.categoryId,
          memo: s.memo,
          debit: stripAmountFormatting(s.debit) || undefined,
          credit: stripAmountFormatting(s.credit) || undefined,
        })),
      ),
    );
  }
  return fd;
}

export default function RepeatingTransactionsPanel({
  canEdit,
  locale,
  currencyCode,
  accounts,
  sections,
  payees,
  repeatingTransactions,
}: {
  canEdit: boolean;
  locale: string | null;
  currencyCode: string;
  accounts: AccountOption[];
  sections: SectionOption[];
  payees: string[];
  repeatingTransactions: RepeatingTransactionRow[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { pending: savePending, run } = useServerAction();
  const uncategorizedLabel = t("transactions.table.uncategorized");
  const categoryOptions = buildCategoryOptions(sections, uncategorizedLabel);
  const accountGroupLabels: Record<AccountOption["group"], string> = {
    cash: t("appShell.nav.cash"),
    credit: t("appShell.nav.credit"),
  };

  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftState>(() => emptyDraft(accounts));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState | null>(null);

  const [nextOccurrenceEditId, setNextOccurrenceEditId] = useState<string | null>(null);
  const [nextOccurrenceDraft, setNextOccurrenceDraft] = useState("");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function accountName(id: string): string {
    return accounts.find((a) => a.id === id)?.name ?? "";
  }

  function categorySelect(value: string, onChange: (v: string) => void) {
    const selected = categoryOptions.find((c) => c.id === value) ?? categoryOptions[0];
    return (
      <Autocomplete
        size="small"
        options={categoryOptions}
        groupBy={(option) => option.group}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        value={selected}
        onChange={(_e, next) => onChange(next ? next.id : "")}
        disableClearable
        renderGroup={(params) => (
          <li key={params.key}>
            {params.group && (
              <ListSubheader component="div" sx={{ lineHeight: "28px" }}>
                {params.group}
              </ListSubheader>
            )}
            <Box component="ul" sx={{ p: 0 }}>
              {params.children}
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t("transactions.form.categoryPlaceholder")}
            aria-label={t("transactions.form.categoryLabel")}
          />
        )}
      />
    );
  }

  function accountSelect(value: string, onChange: (v: string) => void) {
    const selected = accounts.find((a) => a.id === value) ?? accounts[0];
    return (
      <Autocomplete
        size="small"
        options={accounts}
        groupBy={(option) => accountGroupLabels[option.group]}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        value={selected}
        onChange={(_e, next) => onChange(next ? next.id : "")}
        disableClearable
        renderGroup={(params) => (
          <li key={params.key}>
            <ListSubheader component="div" sx={{ lineHeight: "28px" }}>
              {params.group}
            </ListSubheader>
            <Box component="ul" sx={{ p: 0 }}>
              {params.children}
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} label={t("budgetSettings.repeating.form.account")} />
        )}
      />
    );
  }

  function handleSave(andNew: boolean, draft: DraftState, isEdit: boolean, id: string | null) {
    const error = validateDraft(draft);
    if (error) {
      showToast(td(t, error), "error");
      return;
    }

    run(
      () =>
        isEdit
          ? updateRepeatingTransactionAction(id!, {}, draftToFormData(draft))
          : createRepeatingTransactionAction({}, draftToFormData(draft)),
      () => {
        if (isEdit) {
          setEditingId(null);
          setEditDraft(null);
        } else if (andNew) {
          setAddDraft(emptyDraft(accounts));
        } else {
          setAddOpen(false);
          setAddDraft(emptyDraft(accounts));
        }
        router.refresh();
      },
    );
  }

  function handleToggleActive(id: string) {
    startTransition(async () => {
      const result = await toggleActiveRepeatingTransactionAction(id);
      if (result.error) showToast(td(t, result.error), "error");
      router.refresh();
    });
  }

  function handleUpdateNextOccurrence() {
    if (!nextOccurrenceEditId) return;
    const id = nextOccurrenceEditId;
    run(
      () => updateNextOccurrenceDateAction(id, nextOccurrenceDraft),
      () => {
        setNextOccurrenceEditId(null);
        router.refresh();
      },
    );
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      const result = await deleteRepeatingTransactionAction(deleteTargetId);
      if (result.error) showToast(td(t, result.error), "error");
      setDeleteTargetId(null);
      router.refresh();
    });
  }

  function cadenceLabel(cadence: CadenceOption): string {
    return t(`budgetSettings.repeating.cadences.${cadence}`);
  }

  function draftForm(
    draft: DraftState,
    setDraft: (d: DraftState) => void,
    onCancel: () => void,
    onSave: (andNew: boolean) => void,
  ) {
    return (
      <Box
        style={{ backgroundColor: `${tokens.blue}0f` }}
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "20px", mb: "14px" }}
      >
        <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Box sx={{ flex: "1 1 220px" }}>
            {accountSelect(draft.accountId, (v) => setDraft({ ...draft, accountId: v }))}
          </Box>
          <Autocomplete
            freeSolo
            size="small"
            options={payees}
            value={draft.payeeName}
            onInputChange={(_e, value) => setDraft({ ...draft, payeeName: value })}
            sx={{ flex: "1 1 220px" }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t("transactions.form.payeePlaceholder")}
                aria-label={t("transactions.form.payeeLabel")}
              />
            )}
          />
          {draft.isSplitMode ? (
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between", flex: "1 1 220px" }}
              style={{
                border: `1px solid ${tokens.inputBorder}`,
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                {t("transactions.table.splitLabel")}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setDraft({ ...draft, isSplitMode: false, splits: [] })}
                title={t("transactions.splits.cancelSplit")}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Stack>
          ) : (
            <Box sx={{ flex: "1 1 220px" }}>
              {categorySelect(draft.categoryId, (v) => setDraft({ ...draft, categoryId: v }))}
            </Box>
          )}
          <TextField
            size="small"
            placeholder={t("transactions.form.memoPlaceholder")}
            aria-label={t("transactions.form.memoLabel")}
            value={draft.memo}
            onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
            sx={{ flex: "1 1 220px" }}
          />
        </Stack>
        <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField
            size="small"
            label={t("transactions.table.columns.debit")}
            placeholder={t("transactions.form.amountPlaceholder")}
            aria-label={t("transactions.form.debitLabel")}
            value={draft.debit}
            onChange={(e) => setDraft({ ...draft, debit: e.target.value })}
            sx={{ flex: "1 1 140px" }}
            slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
          />
          <TextField
            size="small"
            label={t("transactions.table.columns.credit")}
            placeholder={t("transactions.form.amountPlaceholder")}
            aria-label={t("transactions.form.creditLabel")}
            value={draft.credit}
            onChange={(e) => setDraft({ ...draft, credit: e.target.value })}
            sx={{ flex: "1 1 140px" }}
            slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
          />
          <TextField
            select
            size="small"
            label={t("budgetSettings.repeating.form.cadence")}
            value={draft.cadence}
            onChange={(e) => setDraft({ ...draft, cadence: e.target.value as CadenceOption })}
            sx={{ flex: "1 1 180px" }}
          >
            {CADENCE_OPTIONS.map((c) => (
              <MenuItem key={c} value={c}>
                {cadenceLabel(c)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            size="small"
            label={t("budgetSettings.repeating.form.nextOccurrence")}
            value={draft.nextOccurrenceDate}
            onChange={(e) => setDraft({ ...draft, nextOccurrenceDate: e.target.value })}
            sx={{ flex: "1 1 190px" }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        {draft.isSplitMode ? (
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{ fontSize: 11, textTransform: "uppercase", mb: "6px" }}
              style={{ color: tokens.textFaint }}
            >
              {t("transactions.splits.header")}
            </Typography>
            <Stack sx={{ gap: 1 }}>
              {draft.splits.map((split, i) => (
                <Stack key={i} direction="row" sx={{ gap: 1, alignItems: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    {categorySelect(split.categoryId, (v) => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], categoryId: v };
                      setDraft({ ...draft, splits: next });
                    })}
                  </Box>
                  <TextField
                    size="small"
                    placeholder={t("transactions.form.memoPlaceholder")}
                    aria-label={t("transactions.form.memoLabel")}
                    sx={{ flex: 1 }}
                    value={split.memo}
                    onChange={(e) => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], memo: e.target.value };
                      setDraft({ ...draft, splits: next });
                    }}
                  />
                  <TextField
                    size="small"
                    placeholder={t("transactions.form.amountPlaceholder")}
                    aria-label={t("transactions.form.debitLabel")}
                    sx={{ width: 90 }}
                    value={split.debit}
                    onChange={(e) => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], debit: e.target.value };
                      setDraft({ ...draft, splits: next });
                    }}
                    slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                  />
                  <TextField
                    size="small"
                    placeholder={t("transactions.form.amountPlaceholder")}
                    aria-label={t("transactions.form.creditLabel")}
                    sx={{ width: 90 }}
                    value={split.credit}
                    onChange={(e) => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], credit: e.target.value };
                      setDraft({ ...draft, splits: next });
                    }}
                    slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                  />
                  <IconButton
                    size="small"
                    title={t("transactions.splits.removeSplit")}
                    onClick={() =>
                      setDraft({ ...draft, splits: draft.splits.filter((_, idx) => idx !== i) })
                    }
                  >
                    <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
                  </IconButton>
                </Stack>
              ))}
              <ClickableText
                onClick={() => setDraft({ ...draft, splits: [...draft.splits, emptySplitDraft()] })}
                sx={{ fontSize: 11.5, cursor: "pointer" }}
                style={{ color: tokens.blue }}
              >
                {t("transactions.splits.addSplit")}
              </ClickableText>
            </Stack>
          </Box>
        ) : (
          <ClickableText
            onClick={() =>
              setDraft({
                ...draft,
                isSplitMode: true,
                categoryId: "",
                splits: [emptySplitDraft(), emptySplitDraft()],
              })
            }
            sx={{ fontSize: 11.5, cursor: "pointer", mb: 1 }}
            style={{ color: tokens.blue }}
          >
            {t("transactions.splits.splitIntoMultiple")}
          </ClickableText>
        )}

        <Stack direction="row" sx={{ gap: 1 }}>
          <AdminButton variant="contained" disabled={savePending} onClick={() => onSave(false)}>
            {t("common.save")}
          </AdminButton>
          {!editingId && (
            <AdminButton disabled={savePending} onClick={() => onSave(true)}>
              {t("transactions.form.saveAndNew")}
            </AdminButton>
          )}
          <AdminButton onClick={onCancel}>{t("common.cancel")}</AdminButton>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}
      >
        <SectionHeader
          title={t("budgetSettings.repeating.title")}
          subtitle={t("budgetSettings.repeating.subtitle")}
          headingLevel="h2"
        />
        {canEdit && !addOpen && !isMobile && (
          <AdminButton
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              setAddDraft(emptyDraft(accounts));
              setAddOpen(true);
            }}
          >
            {t("budgetSettings.repeating.addButton")}
          </AdminButton>
        )}
      </Stack>

      {canEdit && !addOpen && isMobile && (
        <Box
          component="button"
          onClick={() => {
            setAddDraft(emptyDraft(accounts));
            setAddOpen(true);
          }}
          aria-label={t("budgetSettings.repeating.addButton")}
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

      {canEdit && addOpen && (
        <Box sx={{ mt: "14px" }}>
          {draftForm(
            addDraft,
            setAddDraft,
            () => setAddOpen(false),
            (andNew) => handleSave(andNew, addDraft, false, null),
          )}
        </Box>
      )}

      {repeatingTransactions.length === 0 && !addOpen && (
        <Typography sx={{ fontSize: 12.5, mt: 2 }} style={{ color: tokens.textDisabled }}>
          {t("budgetSettings.repeating.empty")}
        </Typography>
      )}

      <Stack sx={{ gap: "10px", mt: "20px" }}>
        {repeatingTransactions.map((rt) =>
          editingId === rt.id && editDraft ? (
            <Box key={rt.id}>
              {draftForm(
                editDraft,
                setEditDraft,
                () => {
                  setEditingId(null);
                  setEditDraft(null);
                },
                () => handleSave(false, editDraft, true, rt.id),
              )}
            </Box>
          ) : (
            <RepeatingTransactionRowCard
              key={rt.id}
              rt={rt}
              isMobile={isMobile}
              canEdit={canEdit}
              tokens={tokens}
              t={t}
              locale={locale}
              currencyCode={currencyCode}
              uncategorizedLabel={uncategorizedLabel}
              accountName={accountName}
              onEdit={() => {
                setEditingId(rt.id);
                setEditDraft(draftFromRow(rt));
              }}
              onToggleActive={() => handleToggleActive(rt.id)}
              onDelete={() => {
                if (rt.hasHistory) {
                  showToast(t("budgetSettings.repeating.hasHistoryToast"), "info");
                  return;
                }
                setDeleteTargetId(rt.id);
              }}
              onEditNextOccurrence={() => {
                setNextOccurrenceEditId(rt.id);
                setNextOccurrenceDraft(rt.nextOccurrenceDate.slice(0, 10));
              }}
            />
          ),
        )}
      </Stack>

      <Dialog
        open={nextOccurrenceEditId !== null}
        onClose={() => setNextOccurrenceEditId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("budgetSettings.repeating.editNextOccurrence")}
        </DialogTitle>
        <DialogContent>
          <TextField
            type="date"
            size="small"
            fullWidth
            label={t("budgetSettings.repeating.form.nextOccurrence")}
            value={nextOccurrenceDraft}
            onChange={(e) => setNextOccurrenceDraft(e.target.value)}
            sx={{ mt: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNextOccurrenceEditId(null)} sx={{ color: "text.secondary" }}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" disabled={savePending} onClick={handleUpdateNextOccurrence}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t("budgetSettings.repeating.deleteConfirm.title")}
        description={t("budgetSettings.repeating.deleteConfirm.description")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}

function RepeatingTransactionRowCard({
  rt,
  isMobile,
  canEdit,
  tokens,
  t,
  locale,
  currencyCode,
  uncategorizedLabel,
  accountName,
  onEdit,
  onToggleActive,
  onDelete,
  onEditNextOccurrence,
}: {
  rt: RepeatingTransactionRow;
  isMobile: boolean;
  canEdit: boolean;
  tokens: Record<string, string>;
  t: unknown;
  locale: string | null;
  currencyCode: string;
  uncategorizedLabel: string;
  accountName: (id: string) => string;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onEditNextOccurrence: () => void;
}) {
  const cadenceLabelText = td(
    t,
    `budgetSettings.repeating.cadences.${repeatTypeToCadence(rt.repeatType as never, rt.intervalWeeks)}`,
  );
  const amountText = rt.debit
    ? formatCurrency(rt.debit, locale, currencyCode)
    : rt.credit
      ? formatCurrency(rt.credit, locale, currencyCode)
      : "";
  const amountColor = rt.debit ? tokens.red : rt.credit ? tokens.green : tokens.textBody;

  const badges = (
    <>
      <Chip label={accountName(rt.accountId)} size="small" />
      <Chip
        label={
          rt.isSplit
            ? td(t, "transactions.table.splitLabel")
            : (rt.categoryName ?? uncategorizedLabel)
        }
        size="small"
      />
      <Chip label={cadenceLabelText} size="small" />
      {!rt.isActive && (
        <Chip label={td(t, "budgetSettings.repeating.inactive")} size="small" color="default" />
      )}
    </>
  );

  const managedByBadge = rt.isSubscriptionLinked && (
    <Chip
      label={td(t, "budgetSettings.repeating.managedBySubscription")}
      size="small"
      sx={{ height: 18, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}
      style={{ backgroundColor: tokens.amber, color: "#1b1400" }}
    />
  );

  const actionButtons = (
    <Stack
      direction="row"
      sx={{ gap: 0.5, justifyContent: "flex-end", width: ACTIONS_COLUMN_WIDTH, flex: "none" }}
    >
      {rt.isSubscriptionLinked
        ? canEdit && (
            <IconButton
              size="small"
              title={td(t, "budgetSettings.repeating.editNextOccurrence")}
              onClick={onEditNextOccurrence}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )
        : canEdit && (
            <>
              <IconButton size="small" title={td(t, "common.edit")} onClick={onEdit}>
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                title={
                  rt.isActive
                    ? td(t, "budgetSettings.repeating.deactivate")
                    : td(t, "budgetSettings.repeating.reactivate")
                }
                onClick={onToggleActive}
              >
                {rt.isActive ? (
                  <PauseIcon sx={{ fontSize: 16 }} />
                ) : (
                  <PlayArrowIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
              <IconButton
                size="small"
                title={
                  rt.hasHistory
                    ? td(t, "budgetSettings.repeating.hasHistoryTitle")
                    : td(t, "common.delete")
                }
                onClick={onDelete}
              >
                <DeleteIcon
                  sx={{ fontSize: 16 }}
                  style={{ color: rt.hasHistory ? tokens.textFaint : tokens.red }}
                />
              </IconButton>
            </>
          )}
    </Stack>
  );

  const nextOccurrenceText = td(t, "budgetSettings.repeating.nextOn", {
    date: formatDateOnly(rt.nextOccurrenceDate, { month: "short", day: "numeric" }),
  });

  const cardSx = {
    border: `1px solid ${tokens.border}`,
    borderRadius: "8px",
    p: "12px",
    opacity: rt.isActive ? 1 : 0.55,
  };

  if (isMobile) {
    return (
      <Box sx={cardSx} style={{ backgroundColor: tokens.cardBackground }}>
        <Stack sx={{ gap: "8px" }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Typography
              sx={{ fontSize: 13, fontWeight: 600, minWidth: 0, flex: 1 }}
              style={{ color: tokens.textBody }}
            >
              {rt.payeeName}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} style={{ color: amountColor }}>
              {amountText}
            </Typography>
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {nextOccurrenceText}
            </Typography>
            {actionButtons}
          </Stack>
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            {badges}
          </Stack>
          {managedByBadge && <Box>{managedByBadge}</Box>}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={cardSx} style={{ backgroundColor: tokens.cardBackground }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: tokens.textBody }}>
            {rt.payeeName}
          </Typography>
          {managedByBadge}
        </Stack>
        {badges}
        <Typography
          sx={{ fontSize: 12.5, fontWeight: 600, width: 90, textAlign: "right" }}
          style={{ color: amountColor }}
        >
          {amountText}
        </Typography>
        <Typography sx={{ fontSize: 12, width: 110 }} style={{ color: tokens.textFaint }}>
          {nextOccurrenceText}
        </Typography>
        {actionButtons}
      </Stack>
    </Box>
  );
}
