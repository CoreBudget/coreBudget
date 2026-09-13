"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckIcon from "@mui/icons-material/Check";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LanguageIcon from "@mui/icons-material/Language";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import PaymentIcon from "@mui/icons-material/Payment";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LabelIcon from "@mui/icons-material/Label";
import RepeatIcon from "@mui/icons-material/Repeat";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import AdminButton from "../../../admin/_shared/AdminButton";
import CsvImportModal, { type CsvImportField } from "../../../_shared/csvImport/CsvImportModal";
import ConfirmDialog from "../../../_shared/ConfirmDialog";
import ClickableText from "../../../_shared/ClickableText";
import { useTokens } from "@/theme";
import { useToast } from "../../../_shared/ToastProvider";
import { useTour } from "../../../_shared/tours/useTour";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { evaluateInlineMath } from "@/lib/inlineMath";
import { parseAmountInput, stripAmountFormatting } from "@/lib/amount";
import { td } from "@/lib/i18n/translateDynamicKey";
import { activateOnEnterOrSpace } from "@/lib/keyboardActivation";
import { ACCOUNT_TYPE_ICONS } from "../../accountTypes";
import { accountTypeLabel } from "../../accountTypeLabels";
import ViewFiltersPanel from "./ViewFiltersPanel";
import { useIsMobile } from "../../useIsMobile";
import {
  isWithinRange,
  type SortColumn,
  type SortDirection,
  type ViewPreference,
} from "./viewPreference";
import {
  approveTransactionAction,
  bulkApproveTransactionsAction,
  bulkCategorizeTransactionsAction,
  bulkDeleteTransactionsAction,
  bulkRejectTransactionsAction,
  bulkSetClearedAction,
  createRepeatingFromTransactionAction,
  createTransactionAction,
  duplicateTransactionAction,
  importTransactionsAction,
  lookupPayeeAutoCategoryAction,
  reconcileAccountAction,
  recordAccountPaymentAction,
  rejectTransactionAction,
  saveTransactionViewPreferenceAction,
  setAllSplitsCollapsedAction,
  toggleClearedAction,
  toggleSplitsCollapsedAction,
  updateTransactionAction,
} from "./actions";
import {
  CADENCE_OPTIONS,
  repeatTypeToCadence,
  type CadenceOption,
} from "../../budget-settings/repeating/cadence";
import type { SectionOption } from "../../_shared/budgetPickerTypes";

interface SplitRow {
  id: string;
  categoryId: string;
  categoryName: string;
  memo: string | null;
  debit: string | null;
  credit: string | null;
}

export interface TransactionRow {
  id: string;
  postDate: string;
  payeeName: string;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  debit: string | null;
  credit: string | null;
  runningBalance: string;
  cleared: boolean;
  reconciled: boolean;
  pendingApproval: boolean;
  isScheduled: boolean;
  repeatingTransactionId: string | null;
  isSplit: boolean;
  splitsCollapsed: boolean;
  splits: SplitRow[];
}

interface UpcomingRepeatingTransactionRow {
  id: string;
  payeeName: string;
  categoryName: string | null;
  isSplit: boolean;
  debit: string | null;
  credit: string | null;
  repeatType: string;
  intervalWeeks: number | null;
  nextOccurrenceDate: string;
}

interface TransactionsViewProps {
  accountId: string;
  accountName: string;
  accountType: string;
  accountWebsite: string | null;
  accountPaymentDueDay: number | null;
  accountCardExpiration: string | null;
  clearedBalance: string;
  unclearedBalance: string;
  balance: string;
  canEdit: boolean;
  currencyCode: string;
  locale: string | null;
  sections: SectionOption[];
  payees: string[];
  transactions: TransactionRow[];
  upcomingRepeatingTransactions: UpcomingRepeatingTransactionRow[];
  reconciledDate: string | null;
  initialViewPreference: ViewPreference;
  cashAccounts: { id: string; name: string }[];
}

const BASE_COLUMNS = "28px 130px minmax(100px,1.3fr) 220px minmax(80px,1fr) 90px 90px";
const CLEARED_COLUMN = "34px";
const RUNNING_BALANCE_COLUMN = "100px";
const NEEDS_REVIEW_ACTIONS_COLUMN = "70px";

function NEEDS_REVIEW_COLUMNS(showRunningBalance: boolean): string {
  return `${BASE_COLUMNS}${showRunningBalance ? ` ${RUNNING_BALANCE_COLUMN}` : ""} ${NEEDS_REVIEW_ACTIONS_COLUMN}`;
}

function defaultSortDirection(column: SortColumn): SortDirection {
  return column === "payee" || column === "category" || column === "memo" ? "asc" : "desc";
}

interface SplitDraft {
  categoryId: string;
  memo: string;
  debit: string;
  credit: string;
}

interface DraftState {
  postDate: string;
  payeeName: string;
  categoryId: string;
  memo: string;
  debit: string;
  credit: string;
  cleared: boolean;
  isSplitMode: boolean;
  splits: SplitDraft[];
}

function emptySplitDraft(): SplitDraft {
  return { categoryId: "", memo: "", debit: "", credit: "" };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
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

function emptyDraft(date = today()): DraftState {
  return {
    postDate: date,
    payeeName: "",
    categoryId: "",
    memo: "",
    debit: "",
    credit: "",
    cleared: false,
    isSplitMode: false,
    splits: [],
  };
}

function draftFromRow(row: TransactionRow): DraftState {
  return {
    postDate: row.postDate.slice(0, 10),
    payeeName: row.payeeName,
    categoryId: row.categoryId ?? "",
    memo: row.memo ?? "",
    debit: row.debit ?? "",
    credit: row.credit ?? "",
    cleared: row.cleared,
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

function validateDraft(draft: DraftState): string | null {
  const debit = parseAmountInput(draft.debit) || 0;
  const credit = parseAmountInput(draft.credit) || 0;
  if (debit && credit) return "transactions.errors.onlyOneAmount";
  if (!debit && !credit) return "transactions.errors.amountRequired";
  if (!draft.payeeName.trim()) return "transactions.errors.payeeRequired";

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
    if (Math.abs(splitNet - parentNet) > 0.005) {
      return "transactions.errors.splitsMismatch";
    }
  }

  return null;
}

function draftToFormData(draft: DraftState): FormData {
  const fd = new FormData();
  fd.set("postDate", draft.postDate);
  fd.set("payeeName", draft.payeeName);
  fd.set("categoryId", draft.categoryId);
  fd.set("memo", draft.memo);
  fd.set("debit", stripAmountFormatting(draft.debit) || "0");
  fd.set("credit", stripAmountFormatting(draft.credit) || "0");
  if (draft.cleared) fd.set("cleared", "on");
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

export default function TransactionsView({
  accountId,
  accountName,
  accountType,
  accountWebsite,
  accountPaymentDueDay,
  accountCardExpiration,
  clearedBalance,
  unclearedBalance,
  balance,
  canEdit,
  currencyCode,
  locale,
  sections,
  payees,
  transactions,
  upcomingRepeatingTransactions,
  reconciledDate,
  initialViewPreference,
  cashAccounts,
}: TransactionsViewProps) {
  const t = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();

  useTour("page:ledger", [
    {
      element: '[data-tour="ledger-search"]',
      title: t("transactions.tour.search.title"),
      description: t("transactions.tour.search.description"),
      side: "bottom",
    },
    {
      element: isMobile ? '[data-tour="ledger-table-mobile"]' : '[data-tour="ledger-table"]',
      title: t("transactions.tour.table.title"),
      description: t("transactions.tour.table.description"),
      side: isMobile ? "bottom" : "top",
    },
  ]);

  const uncategorizedLabel = t("transactions.table.uncategorized");
  const categoryOptions = useMemo(
    () => buildCategoryOptions(sections, uncategorizedLabel),
    [sections, uncategorizedLabel],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftState>(emptyDraft());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedCount = selectedIds.size;

  const [bulkCategorizeOpen, setBulkCategorizeOpen] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleteOneId, setDeleteOneId] = useState<string | null>(null);

  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const selectedPendingCount = selectedPendingIds.size;
  const [needsReviewOpen, setNeedsReviewOpen] = useState(true);

  const [reconcileOpen, setReconcileOpen] = useState(false);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentDate, setRecordPaymentDate] = useState(today());
  const [recordPaymentFromAccountId, setRecordPaymentFromAccountId] = useState("");
  const [recordPaymentAmount, setRecordPaymentAmount] = useState("");
  const [recordPaymentMemo, setRecordPaymentMemo] = useState("");
  const [recordPaymentError, setRecordPaymentError] = useState<string>();

  const [importOpen, setImportOpen] = useState(false);
  const importFields: CsvImportField[] = [
    { key: "date", label: t("transactions.table.columns.date"), required: true },
    { key: "payeeName", label: t("transactions.table.columns.payee"), required: true },
    { key: "category", label: t("transactions.table.columns.category") },
    { key: "memo", label: t("transactions.table.columns.memo") },
    {
      key: "amount",
      label: t("transactions.importCsv.amountLabel"),
      hint: t("transactions.importCsv.amountHint"),
    },
    { key: "debit", label: t("transactions.table.columns.debit") },
    { key: "credit", label: t("transactions.table.columns.credit") },
    {
      key: "type",
      label: t("transactions.importCsv.typeLabel"),
      hint: t("transactions.importCsv.typeHint"),
    },
  ];

  const [upcomingOpen, setUpcomingOpen] = useState(false);

  const [makeRepeatingOpen, setMakeRepeatingOpen] = useState(false);
  const [makeRepeatingCadence, setMakeRepeatingCadence] = useState<CadenceOption>("monthly");
  const [makeRepeatingDate, setMakeRepeatingDate] = useState(today());

  const isCredit = accountType === "credit" || accountType === "line_credit";

  function creditAccountDetails(fontSize: number, iconSize: number) {
    const websiteHref = accountWebsite
      ? /^https?:\/\//i.test(accountWebsite)
        ? accountWebsite
        : `https://${accountWebsite}`
      : null;
    if (!isCredit && !websiteHref) return null;
    return (
      <>
        {isCredit && accountPaymentDueDay && (
          <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
            <EventIcon sx={{ fontSize: iconSize }} style={{ color: tokens.textFaint }} />
            <Typography sx={{ fontSize }} style={{ color: tokens.textFaint }}>
              {t("transactions.header.paymentDueDay", { day: accountPaymentDueDay })}
            </Typography>
          </Stack>
        )}
        {isCredit && accountCardExpiration && (
          <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
            <CreditCardIcon sx={{ fontSize: iconSize }} style={{ color: tokens.textFaint }} />
            <Typography sx={{ fontSize }} style={{ color: tokens.textFaint }}>
              {t("transactions.header.cardExpiration", { date: accountCardExpiration })}
            </Typography>
          </Stack>
        )}
        {websiteHref && (
          <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
            <LanguageIcon sx={{ fontSize: iconSize }} style={{ color: tokens.textFaint }} />
            <Typography
              component="a"
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ fontSize, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              style={{ color: tokens.blue }}
            >
              {accountWebsite}
            </Typography>
          </Stack>
        )}
      </>
    );
  }

  const hasSplits = transactions.some((t) => t.isSplit);
  const pendingTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.pendingApproval)
        .sort((a, b) => a.postDate.localeCompare(b.postDate)),
    [transactions],
  );
  const uncategorizedTotal = useMemo(
    () =>
      transactions
        .filter((t) => !t.isSplit && !t.categoryId && !t.pendingApproval)
        .reduce((sum, t) => sum + (Number(t.debit) || 0) + (Number(t.credit) || 0), 0),
    [transactions],
  );
  const AccountTypeIcon = ACCOUNT_TYPE_ICONS[accountType];
  const accountTypeLabelText = accountTypeLabel(t, accountType);

  const balanceFigures = [
    {
      label: t("transactions.balance.cleared"),
      value: clearedBalance,
      colorFor: (v: number) => (v < 0 ? tokens.red : tokens.green),
    },
    {
      label: t("transactions.balance.uncleared"),
      value: unclearedBalance,
      colorFor: (v: number) => (v < 0 ? tokens.red : v > 0 ? tokens.amber : tokens.textBody),
    },
    {
      label: t("transactions.balance.working"),
      value: balance,
      colorFor: (v: number) => (v < 0 ? tokens.red : tokens.green),
    },
  ];

  const [viewPreference, setViewPreference] = useState<ViewPreference>(initialViewPreference);
  const [searchQuery, setSearchQuery] = useState("");
  const COLUMNS = `${BASE_COLUMNS}${viewPreference.showRunningBalance ? ` ${RUNNING_BALANCE_COLUMN}` : ""} ${CLEARED_COLUMN}`;

  const dataMinYear = useMemo(
    () =>
      transactions.length === 0
        ? new Date().getFullYear()
        : Math.min(...transactions.map((txn) => new Date(txn.postDate).getUTCFullYear())),
    [transactions],
  );
  const dataMaxYear = useMemo(
    () =>
      transactions.length === 0
        ? new Date().getFullYear()
        : Math.max(...transactions.map((txn) => new Date(txn.postDate).getUTCFullYear())),
    [transactions],
  );

  async function handleViewPreferenceChange(next: ViewPreference) {
    setViewPreference(next);
    const result = await saveTransactionViewPreferenceAction(accountId, next);
    if (result.error) showToast(td(t, result.error), "error");
  }

  function handleSort(column: SortColumn) {
    const direction: SortDirection =
      viewPreference.sortColumn === column
        ? viewPreference.sortDirection === "asc"
          ? "desc"
          : "asc"
        : defaultSortDirection(column);
    void handleViewPreferenceChange({
      ...viewPreference,
      sortColumn: column,
      sortDirection: direction,
    });
  }

  const visibleTransactions = useMemo(() => {
    const dir = viewPreference.sortDirection === "asc" ? 1 : -1;
    const col = viewPreference.sortColumn;
    const categoryLabel = (txn: TransactionRow) =>
      txn.isSplit ? t("transactions.table.splitLabel") : (txn.categoryName ?? uncategorizedLabel);
    const query = searchQuery.trim().toLowerCase();

    return transactions
      .filter((txn) => !txn.pendingApproval)
      .filter((txn) => viewPreference.showReconciled || !txn.reconciled)
      .filter((txn) => isWithinRange(txn.postDate, viewPreference.from, viewPreference.to))
      .filter(
        (txn) =>
          !query ||
          [txn.payeeName, txn.memo, categoryLabel(txn)].some((field) =>
            field?.toLowerCase().includes(query),
          ),
      )
      .sort((a, b) => {
        switch (col) {
          case "date":
            return dir * a.postDate.localeCompare(b.postDate);
          case "payee":
            return dir * a.payeeName.localeCompare(b.payeeName);
          case "category":
            return dir * categoryLabel(a).localeCompare(categoryLabel(b));
          case "memo":
            return dir * (a.memo ?? "").localeCompare(b.memo ?? "");
          case "debit":
            return dir * ((Number(a.debit) || 0) - (Number(b.debit) || 0));
          case "credit":
            return dir * ((Number(a.credit) || 0) - (Number(b.credit) || 0));
          case "runningBalance":
            return dir * ((Number(a.runningBalance) || 0) - (Number(b.runningBalance) || 0));
        }
      });
  }, [transactions, viewPreference, t, uncategorizedLabel, searchQuery]);

  function cadenceLabel(repeatType: string, intervalWeeks: number | null): string {
    const cadence = repeatTypeToCadence(repeatType as never, intervalWeeks);
    return td(t, `budgetSettings.repeating.cadences.${cadence}`);
  }

  function sharedDialogs() {
    return (
      <>
        <Dialog
          open={reconcileOpen}
          onClose={() => setReconcileOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t("transactions.reconcile.title")}</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textSecondary }}>
              {t("transactions.reconcile.body")}
            </Typography>
            <Typography
              sx={{ fontSize: 20, fontWeight: 700, mt: 1 }}
              style={{ color: Number(clearedBalance) < 0 ? tokens.red : tokens.textBody }}
            >
              {formatCurrency(clearedBalance, locale, currencyCode)}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setReconcileOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={handleReconcile}>
              {t("common.confirm")}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={recordPaymentOpen}
          onClose={() => setRecordPaymentOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t("accounts.recordPayment.title")}</DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2, mt: 1 }}>
              <TextField
                select
                size="small"
                label={t("accounts.recordPayment.fromAccountLabel")}
                value={recordPaymentFromAccountId}
                onChange={(e) => setRecordPaymentFromAccountId(e.target.value)}
                slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
              >
                <MenuItem value="" disabled>
                  {t("accounts.recordPayment.selectAccountPlaceholder")}
                </MenuItem>
                {cashAccounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                size="small"
                label={t("accounts.recordPayment.dateLabel")}
                value={recordPaymentDate}
                onChange={(e) => setRecordPaymentDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                label={t("accounts.recordPayment.amountLabel")}
                value={recordPaymentAmount}
                onChange={(e) => setRecordPaymentAmount(e.target.value)}
                onBlur={(e) => setRecordPaymentAmount(resolveAmount(e.target.value))}
              />
              <TextField
                size="small"
                label={t("transactions.table.columns.memo")}
                value={recordPaymentMemo}
                onChange={(e) => setRecordPaymentMemo(e.target.value)}
              />
              {recordPaymentError && (
                <Typography sx={{ fontSize: 12.5, color: "error.main" }}>
                  {td(t, recordPaymentError)}
                </Typography>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRecordPaymentOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="contained"
              disabled={pending || !recordPaymentFromAccountId || !recordPaymentAmount}
              onClick={handleRecordPayment}
            >
              {t("accounts.recordPayment.submit")}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={makeRepeatingOpen}
          onClose={() => setMakeRepeatingOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t("transactions.bulk.makeRepeating")}</DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2, mt: 1 }}>
              <TextField
                select
                size="small"
                label={t("budgetSettings.repeating.form.cadence")}
                value={makeRepeatingCadence}
                onChange={(e) => setMakeRepeatingCadence(e.target.value as CadenceOption)}
              >
                {CADENCE_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {t(`budgetSettings.repeating.cadences.${c}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                size="small"
                label={t("budgetSettings.repeating.form.nextOccurrence")}
                value={makeRepeatingDate}
                onChange={(e) => setMakeRepeatingDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMakeRepeatingOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={handleMakeRepeating}>
              {t("common.confirm")}
            </Button>
          </DialogActions>
        </Dialog>

        <CsvImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title={t("transactions.toolbar.importCsv")}
          fields={importFields}
          excludeRow={(row) => (row.type ?? "").trim().toLowerCase() === "payment"}
          onImport={async (rows) => {
            const result = await importTransactionsAction(accountId, rows);
            if (!result.error) {
              router.refresh();
              if (result.skipped) {
                showToast(
                  t("transactions.importCsv.skippedDuplicatesToast", { count: result.skipped }),
                  "info",
                );
              }
            }
            return { error: result.error, imported: result.imported };
          }}
        />

        <Dialog
          open={bulkCategorizeOpen}
          onClose={() => setBulkCategorizeOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {t("transactions.bulk.categorizeDialogTitle", { count: selectedCount })}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>{categorySelect(bulkCategoryId, setBulkCategoryId)}</Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setBulkCategorizeOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={handleBulkCategorize}>
              {t("common.confirm")}
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={bulkDeleteConfirmOpen}
          title={t("transactions.bulk.deleteConfirm.title")}
          description={t("transactions.bulk.deleteConfirm.description", {
            count: selectedIds.size,
          })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pending={pending}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteConfirmOpen(false)}
        />

        <ConfirmDialog
          open={deleteOneId !== null}
          title={t("transactions.deleteOneConfirm.title")}
          description={t("transactions.deleteOneConfirm.description")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          pending={pending}
          onConfirm={handleDeleteOne}
          onCancel={() => setDeleteOneId(null)}
        />
      </>
    );
  }

  function upcomingRepeatingSection() {
    if (upcomingRepeatingTransactions.length === 0) return null;
    return (
      <Box
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", mb: "16px" }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Stack
          direction="row"
          onClick={() => setUpcomingOpen((open) => !open)}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: "14px",
            py: "10px",
            cursor: "pointer",
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700 }} style={{ color: tokens.textBody }}>
            {t("transactions.upcomingRepeating.title", {
              count: upcomingRepeatingTransactions.length,
            })}
          </Typography>
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              transition: "transform .15s",
              transform: upcomingOpen ? "rotate(180deg)" : "none",
            }}
            style={{ color: tokens.textFaint }}
          />
        </Stack>
        {upcomingOpen &&
          upcomingRepeatingTransactions.map((rt) => (
            <Stack
              key={rt.id}
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                px: "14px",
                py: "10px",
                borderTop: `1px solid ${tokens.divider}`,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 500 }}
                  style={{ color: tokens.textBody }}
                >
                  {rt.payeeName}
                </Typography>
                <Typography sx={{ fontSize: 11.5, mt: "2px" }} style={{ color: tokens.textFaint }}>
                  {rt.isSplit
                    ? t("transactions.table.splitLabel")
                    : (rt.categoryName ?? uncategorizedLabel)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flex: "none" }}>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 600 }}
                  style={{ color: tokens.textBody }}
                >
                  {formatCurrency(rt.debit ?? rt.credit ?? "0", locale, currencyCode)}
                </Typography>
                <Typography sx={{ fontSize: 11, mt: "2px" }} style={{ color: tokens.textFaint }}>
                  {[
                    cadenceLabel(rt.repeatType, rt.intervalWeeks),
                    t("transactions.upcomingRepeating.next", {
                      date: formatDateOnly(rt.nextOccurrenceDate, {
                        month: "short",
                        day: "numeric",
                      }),
                    }),
                  ].join(" · ")}
                </Typography>
              </Box>
            </Stack>
          ))}
      </Box>
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePendingSelect(id: string) {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allPendingSelected =
    pendingTransactions.length > 0 && selectedPendingIds.size === pendingTransactions.length;

  function togglePendingSelectAll() {
    setSelectedPendingIds(
      allPendingSelected ? new Set() : new Set(pendingTransactions.map((t) => t.id)),
    );
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await approveTransactionAction(accountId, id);
      if (result.error) showToast(td(t, result.error), "error");
      else showToast(t("transactions.needsReview.approveSuccess"), "success");
      setSelectedPendingIds(new Set());
      router.refresh();
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const result = await rejectTransactionAction(accountId, id);
      if (result.error) showToast(td(t, result.error), "error");
      else showToast(t("transactions.needsReview.rejectSuccess"), "success");
      setSelectedPendingIds(new Set());
      router.refresh();
    });
  }

  function handleBulkApprovePending() {
    const ids = Array.from(selectedPendingIds);
    startTransition(async () => {
      const result = await bulkApproveTransactionsAction(accountId, ids);
      if (result.error) showToast(td(t, result.error), "error");
      setSelectedPendingIds(new Set());
      router.refresh();
    });
  }

  function handleBulkRejectPending() {
    const ids = Array.from(selectedPendingIds);
    startTransition(async () => {
      const result = await bulkRejectTransactionsAction(accountId, ids);
      if (result.error) showToast(td(t, result.error), "error");
      setSelectedPendingIds(new Set());
      router.refresh();
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkDeleteTransactionsAction(accountId, ids);
      if (result.error) showToast(td(t, result.error), "error");
      setSelectedIds(new Set());
      setBulkDeleteConfirmOpen(false);
      router.refresh();
    });
  }

  function handleDeleteOne() {
    if (!deleteOneId) return;
    startTransition(async () => {
      const result = await bulkDeleteTransactionsAction(accountId, [deleteOneId]);
      if (result.error) showToast(td(t, result.error), "error");
      setDeleteOneId(null);
      router.refresh();
    });
  }

  function handleBulkSetCleared() {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkSetClearedAction(accountId, ids);
      if (result.error) showToast(td(t, result.error), "error");
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleBulkCategorize() {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkCategorizeTransactionsAction(accountId, ids, bulkCategoryId);
      if (result.error) {
        showToast(td(t, result.error), "error");
        return;
      }
      setBulkCategorizeOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleDuplicate() {
    const [id] = Array.from(selectedIds);
    if (!id) return;
    startTransition(async () => {
      const result = await duplicateTransactionAction(accountId, id);
      if (result.error) showToast(td(t, result.error), "error");
      else showToast(t("transactions.toolbar.duplicateSuccess"), "success");
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleMakeRepeating() {
    const [id] = Array.from(selectedIds);
    if (!id) return;
    startTransition(async () => {
      const result = await createRepeatingFromTransactionAction(
        accountId,
        id,
        makeRepeatingCadence,
        makeRepeatingDate,
      );
      if (result.error) showToast(td(t, result.error), "error");
      else showToast(t("transactions.bulk.makeRepeatingSuccess"), "success");
      setMakeRepeatingOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleReconcile() {
    startTransition(async () => {
      const result = await reconcileAccountAction(accountId);
      if (result.error) showToast(td(t, result.error), "error");
      else showToast(t("transactions.reconcile.success"), "success");
      setReconcileOpen(false);
      router.refresh();
    });
  }

  function openRecordPayment() {
    const owed = Math.abs(Number(clearedBalance));
    setRecordPaymentAmount(owed > 0 ? owed.toFixed(2) : "");
    setRecordPaymentOpen(true);
  }

  function handleRecordPayment() {
    setRecordPaymentError(undefined);
    const formData = new FormData();
    formData.set("postDate", recordPaymentDate);
    formData.set("fromAccountId", recordPaymentFromAccountId);
    formData.set("amount", recordPaymentAmount);
    formData.set("memo", recordPaymentMemo);
    startTransition(async () => {
      const result = await recordAccountPaymentAction(accountId, {}, formData);
      if (result.error) {
        setRecordPaymentError(result.error);
        return;
      }
      showToast(t("accounts.recordPayment.success"), "success");
      setRecordPaymentOpen(false);
      setRecordPaymentFromAccountId("");
      setRecordPaymentAmount("");
      setRecordPaymentMemo("");
      setRecordPaymentDate(today());
      router.refresh();
    });
  }

  function resolveAmount(value: string): string {
    const cleaned = stripAmountFormatting(value);
    const evaluated = evaluateInlineMath(cleaned);
    return evaluated === null ? cleaned : evaluated.toFixed(2);
  }

  function handleAddSave(andNew: boolean) {
    const draft = {
      ...addDraft,
      debit: resolveAmount(addDraft.debit),
      credit: resolveAmount(addDraft.credit),
    };
    const error = validateDraft(draft);
    if (error) {
      showToast(td(t, error), "error");
      return;
    }

    startTransition(async () => {
      const result = await createTransactionAction(accountId, {}, draftToFormData(draft));
      if (result.error) {
        showToast(td(t, result.error), "error");
        return;
      }
      if (andNew) {
        setAddDraft(emptyDraft(draft.postDate));
      } else {
        setAddOpen(false);
        setAddDraft(emptyDraft());
      }
      router.refresh();
    });
  }

  function handleEditSave() {
    if (!editDraft || !editingId) return;
    const draft = {
      ...editDraft,
      debit: resolveAmount(editDraft.debit),
      credit: resolveAmount(editDraft.credit),
    };
    const error = validateDraft(draft);
    if (error) {
      showToast(td(t, error), "error");
      return;
    }

    startTransition(async () => {
      const result = await updateTransactionAction(
        accountId,
        editingId,
        {},
        draftToFormData(draft),
      );
      if (result.error) {
        showToast(td(t, result.error), "error");
        return;
      }
      setEditingId(null);
      setEditDraft(null);
      router.refresh();
    });
  }

  function handleToggleCleared(id: string) {
    startTransition(async () => {
      const result = await toggleClearedAction(accountId, id);
      if (result.error) showToast(td(t, result.error), "error");
      router.refresh();
    });
  }

  function handleToggleSplitsCollapsed(id: string) {
    startTransition(async () => {
      const result = await toggleSplitsCollapsedAction(accountId, id);
      if (result.error) showToast(td(t, result.error), "error");
      router.refresh();
    });
  }

  function handleSetAllSplitsCollapsed(collapsed: boolean) {
    startTransition(async () => {
      const result = await setAllSplitsCollapsedAction(accountId, collapsed);
      if (result.error) showToast(td(t, result.error), "error");
      router.refresh();
    });
  }

  function sortableHeader(column: SortColumn, label: string, align: "left" | "right" = "left") {
    const active = viewPreference.sortColumn === column;
    const title = active
      ? viewPreference.sortDirection === "asc"
        ? t("transactions.table.sortAscending")
        : t("transactions.table.sortDescending")
      : t("transactions.table.sortInactive");
    return (
      <Box
        component="span"
        onClick={() => handleSort(column)}
        title={title}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          justifyContent: align === "right" ? "flex-end" : "flex-start",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {label}
        {active &&
          (viewPreference.sortDirection === "asc" ? (
            <ArrowUpwardIcon sx={{ fontSize: 12 }} />
          ) : (
            <ArrowDownwardIcon sx={{ fontSize: 12 }} />
          ))}
      </Box>
    );
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

  function handlePayeeBlur(draft: DraftState, setDraft: (d: DraftState) => void) {
    if (draft.categoryId || !draft.payeeName.trim()) return;
    lookupPayeeAutoCategoryAction(accountId, draft.payeeName).then((categoryId) => {
      if (categoryId) setDraft({ ...draft, categoryId });
    });
  }

  function draftRow(draft: DraftState, setDraft: (d: DraftState) => void, reconciled = false) {
    return (
      <Box
        style={{ backgroundColor: `${tokens.blue}0f` }}
        sx={{ borderBottom: `1px solid ${tokens.divider}` }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: COLUMNS,
            gap: "10px",
            alignItems: "center",
            p: "10px 14px",
          }}
        >
          <span />
          <TextField
            type="date"
            size="small"
            value={draft.postDate}
            aria-label={t("transactions.form.postDateLabel")}
            onChange={(e) => setDraft({ ...draft, postDate: e.target.value })}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={payees}
            value={draft.payeeName}
            onInputChange={(_e, value) => setDraft({ ...draft, payeeName: value })}
            onBlur={() => handlePayeeBlur(draft, setDraft)}
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
              sx={{ alignItems: "center", justifyContent: "space-between", height: "100%" }}
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
            categorySelect(draft.categoryId, (v) => setDraft({ ...draft, categoryId: v }))
          )}
          <TextField
            size="small"
            placeholder={t("transactions.form.memoPlaceholder")}
            aria-label={t("transactions.form.memoLabel")}
            value={draft.memo}
            onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
          />
          <TextField
            size="small"
            placeholder={t("transactions.form.amountPlaceholder")}
            aria-label={t("transactions.form.debitLabel")}
            value={draft.debit}
            onChange={(e) => setDraft({ ...draft, debit: e.target.value })}
            onBlur={() => setDraft({ ...draft, debit: resolveAmount(draft.debit) })}
            slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
          />
          <TextField
            size="small"
            placeholder={t("transactions.form.amountPlaceholder")}
            aria-label={t("transactions.form.creditLabel")}
            value={draft.credit}
            onChange={(e) => setDraft({ ...draft, credit: e.target.value })}
            onBlur={() => setDraft({ ...draft, credit: resolveAmount(draft.credit) })}
            slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
          />
          {viewPreference.showRunningBalance && <span />}
          {reconciled ? (
            <LockIcon
              sx={{ fontSize: 15, justifySelf: "center" }}
              style={{ color: tokens.green }}
              titleAccess={t("transactions.form.reconciledLockedTitle")}
            />
          ) : (
            <Checkbox
              checked={draft.cleared}
              onChange={(e) => setDraft({ ...draft, cleared: e.target.checked })}
              title={t("transactions.form.clearedCheckboxTitle")}
              size="small"
              sx={{ width: 28, height: 28, p: 0, justifySelf: "center" }}
            />
          )}
        </Box>

        {draft.isSplitMode ? (
          <Box sx={{ px: "14px", pb: "12px", pl: "58px" }}>
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
                    onBlur={() => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], debit: resolveAmount(next[i].debit) };
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
                    onBlur={() => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], credit: resolveAmount(next[i].credit) };
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
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <ClickableText
                  onClick={() =>
                    setDraft({ ...draft, splits: [...draft.splits, emptySplitDraft()] })
                  }
                  sx={{ fontSize: 11.5, cursor: "pointer" }}
                  style={{ color: tokens.blue }}
                >
                  {t("transactions.splits.addSplit")}
                </ClickableText>
                <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                  {t("transactions.splits.totals", {
                    debit: formatCurrency(
                      draft.splits.reduce((s, sp) => s + (parseAmountInput(sp.debit) || 0), 0),
                      locale,
                      currencyCode,
                    ),
                    credit: formatCurrency(
                      draft.splits.reduce((s, sp) => s + (parseAmountInput(sp.credit) || 0), 0),
                      locale,
                      currencyCode,
                    ),
                  })}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ px: "14px", pb: "10px", pl: "58px" }}>
            <ClickableText
              onClick={() =>
                setDraft({
                  ...draft,
                  isSplitMode: true,
                  categoryId: "",
                  splits: [emptySplitDraft(), emptySplitDraft()],
                })
              }
              sx={{ fontSize: 11.5, cursor: "pointer" }}
              style={{ color: tokens.blue }}
            >
              {t("transactions.splits.splitIntoMultiple")}
            </ClickableText>
          </Box>
        )}
      </Box>
    );
  }

  function mobileDraftForm(
    draft: DraftState,
    setDraft: (d: DraftState) => void,
    onCancel: () => void,
    onSave: (andNew: boolean) => void,
    isEdit: boolean,
    reconciled = false,
  ) {
    return (
      <Box
        style={{ backgroundColor: `${tokens.blue}0f` }}
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "14px", mb: "10px" }}
      >
        <Stack sx={{ gap: 1.5 }}>
          <TextField
            type="date"
            size="small"
            fullWidth
            value={draft.postDate}
            aria-label={t("transactions.form.postDateLabel")}
            onChange={(e) => setDraft({ ...draft, postDate: e.target.value })}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={payees}
            value={draft.payeeName}
            onInputChange={(_e, value) => setDraft({ ...draft, payeeName: value })}
            onBlur={() => handlePayeeBlur(draft, setDraft)}
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
              sx={{ alignItems: "center", justifyContent: "space-between" }}
              style={{
                border: `1px solid ${tokens.inputBorder}`,
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textBody }}>
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
            categorySelect(draft.categoryId, (v) => setDraft({ ...draft, categoryId: v }))
          )}
          <TextField
            size="small"
            fullWidth
            placeholder={t("transactions.form.memoPlaceholder")}
            aria-label={t("transactions.form.memoLabel")}
            value={draft.memo}
            onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
          />
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <TextField
              size="small"
              sx={{ flex: 1 }}
              placeholder={t("transactions.form.amountPlaceholder")}
              aria-label={t("transactions.form.debitLabel")}
              value={draft.debit}
              onChange={(e) => setDraft({ ...draft, debit: e.target.value })}
              onBlur={() => setDraft({ ...draft, debit: resolveAmount(draft.debit) })}
              slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
            />
            <TextField
              size="small"
              sx={{ flex: 1 }}
              placeholder={t("transactions.form.amountPlaceholder")}
              aria-label={t("transactions.form.creditLabel")}
              value={draft.credit}
              onChange={(e) => setDraft({ ...draft, credit: e.target.value })}
              onBlur={() => setDraft({ ...draft, credit: resolveAmount(draft.credit) })}
              slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
            />
          </Stack>

          {reconciled ? (
            <Stack direction="row" sx={{ alignItems: "center", gap: "6px" }}>
              <LockIcon sx={{ fontSize: 15 }} style={{ color: tokens.green }} />
              <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                {t("transactions.form.reconciledLockedTitle")}
              </Typography>
            </Stack>
          ) : (
            <Stack
              component="label"
              direction="row"
              sx={{ alignItems: "center", gap: "6px", cursor: "pointer" }}
            >
              <Checkbox
                checked={draft.cleared}
                onChange={(e) => setDraft({ ...draft, cleared: e.target.checked })}
                size="small"
                sx={{ p: 0 }}
              />
              <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                {t("transactions.form.clearedCheckboxTitle")}
              </Typography>
            </Stack>
          )}

          {draft.isSplitMode ? (
            <Box>
              <Typography
                sx={{ fontSize: 11, textTransform: "uppercase", mb: "6px" }}
                style={{ color: tokens.textFaint }}
              >
                {t("transactions.splits.header")}
              </Typography>
              <Stack sx={{ gap: 1 }}>
                {draft.splits.map((split, i) => (
                  <Stack
                    key={i}
                    sx={{ gap: 1, p: "10px", borderRadius: "8px" }}
                    style={{ border: `1px solid ${tokens.divider}` }}
                  >
                    {categorySelect(split.categoryId, (v) => {
                      const next = [...draft.splits];
                      next[i] = { ...next[i], categoryId: v };
                      setDraft({ ...draft, splits: next });
                    })}
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={t("transactions.form.memoPlaceholder")}
                      aria-label={t("transactions.form.memoLabel")}
                      value={split.memo}
                      onChange={(e) => {
                        const next = [...draft.splits];
                        next[i] = { ...next[i], memo: e.target.value };
                        setDraft({ ...draft, splits: next });
                      }}
                    />
                    <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
                      <TextField
                        size="small"
                        sx={{ flex: 1 }}
                        placeholder={t("transactions.form.amountPlaceholder")}
                        aria-label={t("transactions.form.debitLabel")}
                        value={split.debit}
                        onChange={(e) => {
                          const next = [...draft.splits];
                          next[i] = { ...next[i], debit: e.target.value };
                          setDraft({ ...draft, splits: next });
                        }}
                        onBlur={() => {
                          const next = [...draft.splits];
                          next[i] = { ...next[i], debit: resolveAmount(next[i].debit) };
                          setDraft({ ...draft, splits: next });
                        }}
                        slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                      />
                      <TextField
                        size="small"
                        sx={{ flex: 1 }}
                        placeholder={t("transactions.form.amountPlaceholder")}
                        aria-label={t("transactions.form.creditLabel")}
                        value={split.credit}
                        onChange={(e) => {
                          const next = [...draft.splits];
                          next[i] = { ...next[i], credit: e.target.value };
                          setDraft({ ...draft, splits: next });
                        }}
                        onBlur={() => {
                          const next = [...draft.splits];
                          next[i] = { ...next[i], credit: resolveAmount(next[i].credit) };
                          setDraft({ ...draft, splits: next });
                        }}
                        slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
                      />
                      <IconButton
                        size="small"
                        title={t("transactions.splits.removeSplit")}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            splits: draft.splits.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.textFaint }} />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <ClickableText
                    onClick={() =>
                      setDraft({ ...draft, splits: [...draft.splits, emptySplitDraft()] })
                    }
                    sx={{ fontSize: 11.5, cursor: "pointer" }}
                    style={{ color: tokens.blue }}
                  >
                    {t("transactions.splits.addSplit")}
                  </ClickableText>
                  <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                    {t("transactions.splits.totals", {
                      debit: formatCurrency(
                        draft.splits.reduce((s, sp) => s + (parseAmountInput(sp.debit) || 0), 0),
                        locale,
                        currencyCode,
                      ),
                      credit: formatCurrency(
                        draft.splits.reduce((s, sp) => s + (parseAmountInput(sp.credit) || 0), 0),
                        locale,
                        currencyCode,
                      ),
                    })}
                  </Typography>
                </Stack>
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
              sx={{ fontSize: 11.5, cursor: "pointer" }}
              style={{ color: tokens.blue }}
            >
              {t("transactions.splits.splitIntoMultiple")}
            </ClickableText>
          )}

          <Stack direction="row" sx={{ gap: 1 }}>
            <AdminButton variant="contained" disabled={pending} onClick={() => onSave(false)}>
              {t("common.save")}
            </AdminButton>
            {!isEdit && (
              <AdminButton disabled={pending} onClick={() => onSave(true)}>
                {t("transactions.form.saveAndNew")}
              </AdminButton>
            )}
            <AdminButton onClick={onCancel}>{t("common.cancel")}</AdminButton>
          </Stack>
        </Stack>
      </Box>
    );
  }

  function mobileTxnCard(txn: TransactionRow) {
    return (
      <Box key={txn.id} sx={{ mb: "8px" }}>
        <Box
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
          onClick={() => {
            if (!canEdit) return;
            setEditingId(txn.id);
            setEditDraft(draftFromRow(txn));
          }}
          onKeyDown={
            canEdit
              ? activateOnEnterOrSpace(() => {
                  setEditingId(txn.id);
                  setEditDraft(draftFromRow(txn));
                })
              : undefined
          }
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            p: "12px",
            borderRadius: "10px",
            cursor: canEdit ? "pointer" : "default",
          }}
          style={{ backgroundColor: tokens.cardBackground, border: `1px solid ${tokens.border}` }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              style={{ color: tokens.textBody }}
            >
              {txn.payeeName}
            </Typography>
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: "4px", mt: "2px", minWidth: 0 }}
            >
              <Typography sx={{ fontSize: 11.5, flex: "none" }} style={{ color: tokens.textFaint }}>
                {formatDateOnly(txn.postDate, { month: "short", day: "numeric" })} ·
              </Typography>
              {txn.isSplit && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSplitsCollapsed(txn.id);
                  }}
                  sx={{ p: 0, width: 18, height: 18, flex: "none" }}
                  aria-label={
                    txn.splitsCollapsed
                      ? t("transactions.table.expandSplits")
                      : t("transactions.table.collapseSplits")
                  }
                >
                  {txn.splitsCollapsed ? (
                    <ChevronRightIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
                  ) : (
                    <ExpandMoreIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
                  )}
                </IconButton>
              )}
              <Typography
                sx={{
                  fontSize: 11.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                style={{ color: tokens.textFaint }}
              >
                {txn.isSplit
                  ? t("transactions.table.splitCategoryLabel")
                  : (txn.categoryName ?? uncategorizedLabel)}
              </Typography>
            </Stack>
          </Box>
          <Stack sx={{ alignItems: "flex-end", flex: "none" }}>
            <Typography
              sx={{ fontSize: 14, fontWeight: 700 }}
              style={{ color: txn.credit ? tokens.green : tokens.textBody }}
            >
              {txn.debit
                ? formatCurrency(txn.debit, locale, currencyCode)
                : txn.credit
                  ? formatCurrency(txn.credit, locale, currencyCode)
                  : ""}
            </Typography>
            <Stack direction="row" sx={{ alignItems: "center", gap: "8px", mt: "3px" }}>
              {txn.reconciled ? (
                <LockIcon sx={{ fontSize: 13 }} style={{ color: tokens.green }} />
              ) : (
                <>
                  {canEdit && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCleared(txn.id);
                      }}
                      sx={{ p: 0, width: 18, height: 18 }}
                      title={
                        txn.cleared
                          ? t("transactions.table.clearedToggleOn")
                          : t("transactions.table.clearedToggleOff")
                      }
                    >
                      <CheckIcon
                        sx={{ fontSize: 14 }}
                        style={{ color: txn.cleared ? tokens.green : tokens.textFaint }}
                      />
                    </IconButton>
                  )}
                  <Typography
                    sx={{ fontSize: 10, fontWeight: 600 }}
                    style={{ color: txn.cleared ? tokens.green : tokens.textFaint }}
                  >
                    {txn.cleared
                      ? t("transactions.table.clearedStatus")
                      : t("transactions.table.pendingStatus")}
                  </Typography>
                </>
              )}
              {canEdit && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOneId(txn.id);
                  }}
                  sx={{ p: 0, width: 18, height: 18 }}
                  title={t("common.delete")}
                >
                  <CloseIcon sx={{ fontSize: 14 }} style={{ color: tokens.red }} />
                </IconButton>
              )}
            </Stack>
          </Stack>
        </Box>
        {txn.isSplit && !txn.splitsCollapsed && (
          <Box sx={{ pl: "16px", pt: "4px" }}>
            {txn.splits.map((s) => (
              <Stack
                key={s.id}
                direction="row"
                sx={{ justifyContent: "space-between", py: "2px", gap: 1 }}
              >
                <Typography
                  sx={{
                    fontSize: 11.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  style={{ color: tokens.textFaint }}
                >
                  ↳ {s.categoryName}
                </Typography>
                <Typography
                  sx={{ fontSize: 11.5, flex: "none" }}
                  style={{ color: tokens.textFaint }}
                >
                  {s.debit
                    ? formatCurrency(s.debit, locale, currencyCode)
                    : s.credit
                      ? formatCurrency(s.credit, locale, currencyCode)
                      : ""}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  function needsReviewMobileCard(txn: TransactionRow) {
    return (
      <Box
        key={txn.id}
        sx={{ borderRadius: "10px", p: "12px", mb: "8px" }}
        style={{
          backgroundColor: `${tokens.amber}14`,
          border: `1px solid ${tokens.amber}4d`,
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: "6px" }}>
          <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textBody }}>
            {txn.payeeName}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }} style={{ color: tokens.textBody }}>
            {formatCurrency(txn.debit ?? txn.credit ?? "0", locale, currencyCode)}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: "center", gap: "6px", mb: "8px" }}>
          <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
            {[
              formatDateOnly(txn.postDate, { month: "short", day: "numeric" }),
              txn.isSplit
                ? t("transactions.table.splitLabel")
                : (txn.categoryName ?? uncategorizedLabel),
            ].join(" · ")}
          </Typography>
          {txn.repeatingTransactionId ? (
            <Box
              sx={{ px: "6px", py: "1px", borderRadius: "999px", fontSize: 9.5, fontWeight: 700 }}
              style={{ backgroundColor: tokens.amber, color: "#1b1400" }}
            >
              {t("transactions.needsReview.scheduledBadge")}
            </Box>
          ) : (
            <Box
              sx={{ px: "6px", py: "1px", borderRadius: "999px", fontSize: 9.5, fontWeight: 700 }}
              style={{ backgroundColor: tokens.blue, color: "#fff" }}
            >
              {t("transactions.needsReview.importedBadge")}
            </Box>
          )}
        </Stack>
        <Stack direction="row" sx={{ gap: 1 }}>
          <AdminButton
            disabled={pending}
            onClick={() => handleApprove(txn.id)}
            style={{ color: tokens.green, flex: 1 }}
          >
            {t("transactions.needsReview.approve")}
          </AdminButton>
          <AdminButton
            disabled={pending}
            onClick={() => handleReject(txn.id)}
            style={{ color: tokens.red, flex: 1 }}
          >
            {t("transactions.needsReview.reject")}
          </AdminButton>
        </Stack>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box data-tour="ledger-table-mobile" sx={{ p: "14px", position: "relative" }}>
        <Typography sx={{ fontSize: 17, fontWeight: 700 }} style={{ color: tokens.textPrimary }}>
          {accountName}
        </Typography>
        <Stack
          direction="row"
          sx={{ alignItems: "center", gap: "10px", mt: "2px", mb: "10px", flexWrap: "wrap" }}
        >
          <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
            {AccountTypeIcon && (
              <AccountTypeIcon sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }} />
            )}
            <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
              {accountTypeLabelText}
            </Typography>
          </Stack>
          {creditAccountDetails(11.5, 13)}
          {reconciledDate && (
            <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
              <LockIcon sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }} />
              <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                {t("transactions.balance.lastReconciled", {
                  date: new Date(reconciledDate).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  }),
                })}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Stack direction="row" sx={{ gap: "16px", flexWrap: "wrap", mb: "12px" }}>
          {balanceFigures.map((b) => (
            <Box key={b.label}>
              <Typography
                sx={{ fontSize: 10, textTransform: "uppercase" }}
                style={{ color: tokens.textFaint }}
              >
                {b.label}
              </Typography>
              <Typography
                sx={{ fontSize: 14, fontWeight: 700 }}
                style={{ color: b.colorFor(Number(b.value)) }}
              >
                {formatCurrency(b.value, locale, currencyCode)}
              </Typography>
            </Box>
          ))}
          {uncategorizedTotal > 0 && (
            <Box
              sx={{ px: "9px", py: "5px", borderRadius: "999px", fontSize: 11, fontWeight: 600 }}
              style={{ backgroundColor: `${tokens.amber}22`, color: tokens.amber }}
            >
              {t("transactions.balance.uncategorizedPill", {
                amount: formatCurrency(uncategorizedTotal, locale, currencyCode),
              })}
            </Box>
          )}
        </Stack>

        <Stack
          direction="row"
          data-tour="ledger-search"
          sx={{ gap: 1, alignItems: "center", width: "100%", mb: "14px" }}
        >
          <TextField
            size="small"
            placeholder={t("transactions.searchPlaceholder")}
            aria-label={t("transactions.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, minWidth: 0 }}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchIcon
                    sx={{ fontSize: 18, mr: "6px" }}
                    style={{ color: tokens.textFaint }}
                  />
                ),
              },
            }}
          />
          <ViewFiltersPanel
            preference={viewPreference}
            onChange={(next) => void handleViewPreferenceChange(next)}
            dataMinYear={dataMinYear}
            dataMaxYear={dataMaxYear}
            locale={locale}
          />
        </Stack>

        {canEdit && (
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: "14px" }}>
            {isCredit && (
              <AdminButton
                startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
                onClick={openRecordPayment}
              >
                {t("transactions.toolbar.recordPayment")}
              </AdminButton>
            )}
            <AdminButton
              startIcon={<FactCheckIcon sx={{ fontSize: 14 }} />}
              onClick={() => setReconcileOpen(true)}
            >
              {t("transactions.toolbar.reconcile")}
            </AdminButton>
            <AdminButton
              startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
              onClick={() => setImportOpen(true)}
            >
              {t("transactions.toolbar.importCsv")}
            </AdminButton>
            {hasSplits && (
              <>
                <AdminButton
                  disabled={pending}
                  startIcon={<UnfoldMoreIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleSetAllSplitsCollapsed(false)}
                >
                  {t("transactions.toolbar.expandAll")}
                </AdminButton>
                <AdminButton
                  disabled={pending}
                  startIcon={<UnfoldLessIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleSetAllSplitsCollapsed(true)}
                >
                  {t("transactions.toolbar.collapseAll")}
                </AdminButton>
              </>
            )}
          </Stack>
        )}

        {upcomingRepeatingSection()}

        {pendingTransactions.length > 0 && (
          <Box sx={{ mb: "16px" }}>
            <Stack
              direction="row"
              onClick={() => setNeedsReviewOpen((open) => !open)}
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                mb: "8px",
                cursor: "pointer",
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }} style={{ color: tokens.amber }}>
                {t("transactions.needsReview.title", { count: pendingTransactions.length })}
              </Typography>
              <ExpandMoreIcon
                sx={{
                  fontSize: 20,
                  transition: "transform .15s",
                  transform: needsReviewOpen ? "rotate(180deg)" : "none",
                }}
                style={{ color: tokens.textFaint }}
              />
            </Stack>
            {needsReviewOpen && pendingTransactions.map((txn) => needsReviewMobileCard(txn))}
          </Box>
        )}

        {canEdit && addOpen && (
          <Box sx={{ mb: "10px" }}>
            {mobileDraftForm(
              addDraft,
              setAddDraft,
              () => setAddOpen(false),
              (andNew) => handleAddSave(andNew),
              false,
            )}
          </Box>
        )}

        {visibleTransactions.length === 0 && !addOpen && (
          <Typography sx={{ fontSize: 12.5, py: 2 }} style={{ color: tokens.textDisabled }}>
            {t("transactions.table.empty")}
          </Typography>
        )}

        {visibleTransactions.map((txn) =>
          editingId === txn.id && editDraft ? (
            <Box key={txn.id}>
              {mobileDraftForm(
                editDraft,
                setEditDraft,
                () => {
                  setEditingId(null);
                  setEditDraft(null);
                },
                handleEditSave,
                true,
                txn.reconciled,
              )}
            </Box>
          ) : (
            mobileTxnCard(txn)
          ),
        )}

        {canEdit && !addOpen && (
          <Box
            component="button"
            onClick={() => {
              setAddDraft(emptyDraft());
              setAddOpen(true);
            }}
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

        {sharedDialogs()}
      </Box>
    );
  }

  return (
    <Box sx={{ p: "20px 26px" }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "baseline", mb: "14px", gap: 3 }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
            style={{ color: tokens.textPrimary }}
          >
            {accountName}
          </Typography>
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: "12px", mt: "2px", flexWrap: "wrap" }}
          >
            <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
              {AccountTypeIcon && (
                <AccountTypeIcon sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }} />
              )}
              <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
                {accountTypeLabelText}
              </Typography>
            </Stack>
            {creditAccountDetails(12, 13)}
            {reconciledDate && (
              <Stack direction="row" sx={{ alignItems: "center", gap: "5px" }}>
                <LockIcon sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }} />
                <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                  {t("transactions.balance.lastReconciled", {
                    date: new Date(reconciledDate).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    }),
                  })}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>
        <Stack direction="row" sx={{ alignItems: "center", gap: "18px" }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: "18px" }}>
            {balanceFigures.map((b, i) => (
              <Stack key={b.label} direction="row" sx={{ alignItems: "center", gap: "18px" }}>
                {i > 0 && (
                  <Typography
                    sx={{ fontSize: 15, fontWeight: 700 }}
                    style={{ color: tokens.textFaint }}
                  >
                    {i === 1 ? "+" : "="}
                  </Typography>
                )}
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    sx={{ fontSize: 10.5, textTransform: "uppercase" }}
                    style={{ color: tokens.textFaint }}
                  >
                    {b.label}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 15, fontWeight: 700 }}
                    style={{ color: b.colorFor(Number(b.value)) }}
                  >
                    {formatCurrency(b.value, locale, currencyCode)}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
          {uncategorizedTotal > 0 && (
            <Box
              sx={{ px: "10px", py: "5px", borderRadius: "999px", fontSize: 12, fontWeight: 600 }}
              style={{ backgroundColor: `${tokens.amber}22`, color: tokens.amber }}
            >
              {t("transactions.balance.uncategorizedPill", {
                amount: formatCurrency(uncategorizedTotal, locale, currencyCode),
              })}
            </Box>
          )}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", gap: 1, mb: "14px", flexWrap: "wrap" }}
      >
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
          {canEdit && (
            <>
              <AdminButton
                variant="contained"
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  setAddDraft(emptyDraft());
                  setAddOpen(true);
                }}
              >
                {t("transactions.toolbar.addTransaction")}
              </AdminButton>
              {isCredit && (
                <AdminButton
                  startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
                  onClick={openRecordPayment}
                >
                  {t("transactions.toolbar.recordPayment")}
                </AdminButton>
              )}
              <AdminButton
                startIcon={<FactCheckIcon sx={{ fontSize: 14 }} />}
                onClick={() => setReconcileOpen(true)}
              >
                {t("transactions.toolbar.reconcile")}
              </AdminButton>
              <AdminButton
                startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
                onClick={() => setImportOpen(true)}
              >
                {t("transactions.toolbar.importCsv")}
              </AdminButton>
            </>
          )}
        </Stack>
        <Stack
          direction="row"
          data-tour="ledger-search"
          sx={{ gap: 1, alignItems: "center", flexWrap: "nowrap" }}
        >
          <TextField
            size="small"
            placeholder={t("transactions.searchPlaceholder")}
            aria-label={t("transactions.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 220, flex: "none" }}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchIcon
                    sx={{ fontSize: 18, mr: "6px" }}
                    style={{ color: tokens.textFaint }}
                  />
                ),
              },
            }}
          />
          <ViewFiltersPanel
            preference={viewPreference}
            onChange={(next) => void handleViewPreferenceChange(next)}
            dataMinYear={dataMinYear}
            dataMaxYear={dataMaxYear}
            locale={locale}
          />
          {hasSplits && (
            <>
              <AdminButton
                disabled={pending}
                startIcon={<UnfoldMoreIcon sx={{ fontSize: 14 }} />}
                onClick={() => handleSetAllSplitsCollapsed(false)}
              >
                {t("transactions.toolbar.expandAll")}
              </AdminButton>
              <AdminButton
                disabled={pending}
                startIcon={<UnfoldLessIcon sx={{ fontSize: 14 }} />}
                onClick={() => handleSetAllSplitsCollapsed(true)}
              >
                {t("transactions.toolbar.collapseAll")}
              </AdminButton>
            </>
          )}
        </Stack>
      </Stack>

      {upcomingRepeatingSection()}

      {pendingTransactions.length > 0 && (
        <Box
          sx={{
            border: `1px solid ${tokens.amber}55`,
            borderRadius: "10px",
            overflow: "hidden",
            mb: "16px",
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", px: "14px", py: "10px" }}
            style={{ backgroundColor: `${tokens.amber}14` }}
          >
            <Stack direction="row" sx={{ alignItems: "center", gap: "4px" }}>
              <Checkbox
                size="small"
                checked={allPendingSelected}
                indeterminate={selectedPendingCount > 0 && !allPendingSelected}
                onChange={togglePendingSelectAll}
                aria-label={t("transactions.needsReview.selectAll")}
                sx={{ p: "4px" }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }} style={{ color: tokens.amber }}>
                {t("transactions.needsReview.title", { count: pendingTransactions.length })}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              {selectedPendingCount > 0 && (
                <>
                  <AdminButton
                    disabled={pending}
                    startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                    onClick={handleBulkApprovePending}
                  >
                    {t("transactions.needsReview.approveSelected")}
                  </AdminButton>
                  <AdminButton
                    disabled={pending}
                    startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                    onClick={handleBulkRejectPending}
                    style={{ color: tokens.red }}
                  >
                    {t("transactions.needsReview.rejectSelected")}
                  </AdminButton>
                </>
              )}
              <IconButton
                size="small"
                onClick={() => setNeedsReviewOpen((open) => !open)}
                aria-label={
                  needsReviewOpen
                    ? t("transactions.needsReview.collapse")
                    : t("transactions.needsReview.expand")
                }
              >
                <ExpandMoreIcon
                  sx={{
                    fontSize: 20,
                    transition: "transform .15s",
                    transform: needsReviewOpen ? "rotate(180deg)" : "none",
                  }}
                  style={{ color: tokens.textFaint }}
                />
              </IconButton>
            </Stack>
          </Stack>
          {needsReviewOpen &&
            pendingTransactions.map((txn) => (
              <Box
                key={txn.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: NEEDS_REVIEW_COLUMNS(viewPreference.showRunningBalance),
                  gap: "10px",
                  alignItems: "center",
                  px: "14px",
                  py: "10px",
                  borderTop: `1px solid ${tokens.divider}`,
                }}
              >
                <Checkbox
                  checked={selectedPendingIds.has(txn.id)}
                  onChange={() => togglePendingSelect(txn.id)}
                  size="small"
                  sx={{ width: 24, height: 24, p: 0, justifySelf: "center" }}
                />
                <Stack direction="row" sx={{ alignItems: "center", gap: "6px" }}>
                  <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textSecondary }}>
                    {formatDateOnly(txn.postDate, { month: "short", day: "numeric" })}
                  </Typography>
                  {txn.repeatingTransactionId ? (
                    <Box
                      sx={{
                        px: "6px",
                        py: "1px",
                        borderRadius: "999px",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      style={{ backgroundColor: `${tokens.blue}22`, color: tokens.blue }}
                    >
                      {t("transactions.needsReview.scheduledBadge")}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        px: "6px",
                        py: "1px",
                        borderRadius: "999px",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      style={{ backgroundColor: `${tokens.textFaint}22`, color: tokens.textFaint }}
                    >
                      {t("transactions.needsReview.importedBadge")}
                    </Box>
                  )}
                </Stack>
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
                  sx={{
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  style={{
                    color: txn.isSplit || txn.categoryName ? tokens.textSecondary : tokens.amber,
                  }}
                >
                  {txn.isSplit
                    ? t("transactions.table.splitLabel")
                    : (txn.categoryName ?? t("transactions.table.uncategorized"))}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  style={{ color: tokens.textFaint }}
                >
                  {txn.memo}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}
                  style={{ color: tokens.textBody }}
                >
                  {txn.debit ? formatCurrency(txn.debit, locale, currencyCode) : ""}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}
                  style={{ color: tokens.green }}
                >
                  {txn.credit ? formatCurrency(txn.credit, locale, currencyCode) : ""}
                </Typography>
                {viewPreference.showRunningBalance && <span />}
                <Stack direction="row" sx={{ gap: "4px", justifyContent: "center" }}>
                  <IconButton
                    size="small"
                    title={t("transactions.needsReview.approve")}
                    onClick={() => handleApprove(txn.id)}
                    disabled={pending}
                    sx={{ p: "3px" }}
                  >
                    <CheckIcon sx={{ fontSize: 16 }} style={{ color: tokens.green }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    title={t("transactions.needsReview.reject")}
                    onClick={() => handleReject(txn.id)}
                    disabled={pending}
                    sx={{ p: "3px" }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
                  </IconButton>
                </Stack>
              </Box>
            ))}
        </Box>
      )}

      <Box
        data-tour="ledger-table"
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: COLUMNS,
            gap: "10px",
            px: "14px",
            py: "9px",
            fontSize: 11,
            textTransform: "uppercase",
            borderBottom: `1px solid ${tokens.border}`,
          }}
          style={{ color: tokens.textFaint }}
        >
          <span />
          {sortableHeader("date", t("transactions.table.columns.date"))}
          {sortableHeader("payee", t("transactions.table.columns.payee"))}
          {sortableHeader("category", t("transactions.table.columns.category"))}
          {sortableHeader("memo", t("transactions.table.columns.memo"))}
          {sortableHeader("debit", t("transactions.table.columns.debit"), "right")}
          {sortableHeader("credit", t("transactions.table.columns.credit"), "right")}
          {viewPreference.showRunningBalance &&
            sortableHeader(
              "runningBalance",
              t("transactions.table.columns.runningBalance"),
              "right",
            )}
          <span style={{ textAlign: "center" }}>{t("transactions.table.columns.cleared")}</span>
        </Box>

        {canEdit &&
          (addOpen ? (
            <Box>
              {draftRow(addDraft, setAddDraft)}
              <Stack direction="row" sx={{ gap: 1, px: "14px", pt: "10px", pb: "12px" }}>
                <AdminButton
                  variant="contained"
                  disabled={pending}
                  onClick={() => handleAddSave(false)}
                >
                  {t("common.save")}
                </AdminButton>
                <AdminButton disabled={pending} onClick={() => handleAddSave(true)}>
                  {t("transactions.form.saveAndNew")}
                </AdminButton>
                <AdminButton onClick={() => setAddOpen(false)}>{t("common.cancel")}</AdminButton>
              </Stack>
            </Box>
          ) : (
            <Box
              component="button"
              type="button"
              onClick={() => {
                setAddDraft(emptyDraft());
                setAddOpen(true);
              }}
              sx={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "none",
                margin: 0,
                font: "inherit",
                px: "14px",
                py: "11px",
                fontSize: 12.5,
                cursor: "text",
                borderBottom: `1px solid ${tokens.divider}`,
              }}
              style={{ color: tokens.textFaint }}
            >
              {t("transactions.table.addPlaceholder")}
            </Box>
          ))}

        {visibleTransactions.length === 0 && (
          <Typography sx={{ p: 3, fontSize: 12.5 }} style={{ color: tokens.textDisabled }}>
            {t("transactions.table.empty")}
          </Typography>
        )}

        {visibleTransactions.map((txn) =>
          editingId === txn.id && editDraft ? (
            <Box key={txn.id}>
              {draftRow(editDraft, setEditDraft, txn.reconciled)}
              <Stack direction="row" sx={{ gap: 1, px: "14px", pt: "10px", pb: "12px" }}>
                <AdminButton variant="contained" disabled={pending} onClick={handleEditSave}>
                  {t("common.save")}
                </AdminButton>
                <AdminButton
                  onClick={() => {
                    setEditingId(null);
                    setEditDraft(null);
                  }}
                >
                  {t("common.cancel")}
                </AdminButton>
              </Stack>
            </Box>
          ) : (
            <Box key={txn.id}>
              <Box
                onDoubleClick={() => {
                  if (!canEdit) return;
                  setEditingId(txn.id);
                  setEditDraft(draftFromRow(txn));
                }}
                sx={{
                  display: "grid",
                  gridTemplateColumns: COLUMNS,
                  gap: "10px",
                  alignItems: "center",
                  px: "14px",
                  py: "10px",
                  borderBottom:
                    txn.isSplit && !txn.splitsCollapsed ? "none" : `1px solid ${tokens.divider}`,
                  cursor: canEdit ? "pointer" : "default",
                }}
              >
                {canEdit ? (
                  <Checkbox
                    checked={selectedIds.has(txn.id)}
                    onChange={() => toggleSelect(txn.id)}
                    onClick={(e) => e.stopPropagation()}
                    size="small"
                    sx={{ width: 24, height: 24, p: 0, justifySelf: "center" }}
                  />
                ) : (
                  <span />
                )}
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textSecondary }}>
                  {formatDateOnly(txn.postDate, { month: "short", day: "numeric" })}
                </Typography>
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
                <Stack direction="row" sx={{ alignItems: "center", gap: "4px", minWidth: 0 }}>
                  {txn.isSplit && (
                    <IconButton
                      size="small"
                      title={
                        txn.splitsCollapsed
                          ? t("transactions.table.expandSplits")
                          : t("transactions.table.collapseSplits")
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSplitsCollapsed(txn.id);
                      }}
                      sx={{ p: 0, width: 18, height: 18, flex: "none" }}
                    >
                      {txn.splitsCollapsed ? (
                        <ChevronRightIcon
                          sx={{ fontSize: 16 }}
                          style={{ color: tokens.textFaint }}
                        />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
                      )}
                    </IconButton>
                  )}
                  <Typography
                    sx={{
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    style={{
                      color: txn.isSplit
                        ? tokens.textSecondary
                        : txn.categoryName
                          ? tokens.textSecondary
                          : tokens.amber,
                    }}
                  >
                    {txn.isSplit
                      ? t("transactions.table.splitCategoryLabel")
                      : (txn.categoryName ?? t("transactions.table.uncategorized"))}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  style={{ color: tokens.textFaint }}
                >
                  {txn.memo}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}
                  style={{ color: tokens.textBody }}
                >
                  {txn.debit ? formatCurrency(txn.debit, locale, currencyCode) : ""}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right" }}
                  style={{ color: tokens.green }}
                >
                  {txn.credit ? formatCurrency(txn.credit, locale, currencyCode) : ""}
                </Typography>
                {viewPreference.showRunningBalance && (
                  <Typography
                    sx={{ fontSize: 12.5, textAlign: "right" }}
                    style={{ color: tokens.textFaint }}
                  >
                    {formatCurrency(txn.runningBalance, locale, currencyCode)}
                  </Typography>
                )}
                <Box sx={{ textAlign: "center" }}>
                  {txn.reconciled ? (
                    <LockIcon
                      sx={{ fontSize: 13 }}
                      style={{ color: tokens.green }}
                      titleAccess={t("transactions.table.reconciledLocked")}
                    />
                  ) : (
                    <Box
                      component="span"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canEdit) handleToggleCleared(txn.id);
                      }}
                      title={
                        txn.cleared
                          ? t("transactions.table.clearedToggleOn")
                          : t("transactions.table.clearedToggleOff")
                      }
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: canEdit ? "pointer" : "default",
                      }}
                      style={{ color: txn.cleared ? tokens.green : tokens.textFaint }}
                    >
                      {t("transactions.table.columns.cleared")}
                    </Box>
                  )}
                </Box>
              </Box>
              {txn.isSplit && !txn.splitsCollapsed && (
                <Box
                  sx={{
                    px: "14px",
                    pb: "8px",
                    borderBottom: `1px solid ${tokens.divider}`,
                  }}
                >
                  {txn.splits.map((s) => (
                    <Box
                      key={s.id}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: COLUMNS,
                        gap: "10px",
                        py: "2px",
                      }}
                    >
                      <span />
                      <span />
                      <span />
                      <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                        ↳ {s.categoryName}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.textFaint }}>
                        {s.memo}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11.5, textAlign: "right" }}
                        style={{ color: tokens.textFaint }}
                      >
                        {s.debit ? formatCurrency(s.debit, locale, currencyCode) : ""}
                      </Typography>
                      <Typography
                        sx={{ fontSize: 11.5, textAlign: "right" }}
                        style={{ color: tokens.textFaint }}
                      >
                        {s.credit ? formatCurrency(s.credit, locale, currencyCode) : ""}
                      </Typography>
                      {viewPreference.showRunningBalance && <span />}
                      <span />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ),
        )}
      </Box>

      {canEdit && selectedCount > 0 && (
        <Stack
          direction="row"
          sx={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            alignItems: "center",
            gap: 1,
            borderRadius: "12px",
            border: `1px solid ${tokens.borderStrong}`,
            boxShadow: tokens.menuShadow,
            p: "10px 14px",
            zIndex: 30,
          }}
          style={{ backgroundColor: tokens.menuBackground }}
        >
          <Typography
            sx={{ fontSize: 12.5, fontWeight: 600, mr: "6px" }}
            style={{ color: tokens.textBody }}
          >
            {t("transactions.bulk.selectedCount", { count: selectedCount })}
          </Typography>
          <AdminButton
            startIcon={<LabelIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              setBulkCategoryId("");
              setBulkCategorizeOpen(true);
            }}
          >
            {t("transactions.bulk.categorize")}
          </AdminButton>
          {selectedCount > 1 && (
            <AdminButton
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
              onClick={handleBulkSetCleared}
              disabled={pending}
            >
              {t("transactions.bulk.setCleared")}
            </AdminButton>
          )}
          {selectedCount === 1 && (
            <>
              <AdminButton
                startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                onClick={handleDuplicate}
                disabled={pending}
              >
                {t("transactions.bulk.duplicate")}
              </AdminButton>
              <AdminButton
                startIcon={<RepeatIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  setMakeRepeatingCadence("monthly");
                  setMakeRepeatingDate(today());
                  setMakeRepeatingOpen(true);
                }}
              >
                {t("transactions.bulk.makeRepeating")}
              </AdminButton>
            </>
          )}
          <AdminButton
            onClick={() => setBulkDeleteConfirmOpen(true)}
            disabled={pending}
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
            style={{ color: tokens.red }}
          >
            {t("common.delete")}
          </AdminButton>
        </Stack>
      )}

      {sharedDialogs()}
    </Box>
  );
}
