"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import SectionHeader from "../../admin/_shared/SectionHeader";
import AdminButton from "../../admin/_shared/AdminButton";
import ConfirmDialog from "../../_shared/ConfirmDialog";
import { useIsMobile } from "../useIsMobile";
import { useTokens } from "@/theme";
import { useToast } from "../../_shared/ToastProvider";
import { useServerAction } from "../../_shared/useServerAction";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { parseAmountInput, stripAmountFormatting } from "@/lib/amount";
import { td } from "@/lib/i18n/translateDynamicKey";
import SubscriptionsFiltersPanel, {
  DEFAULT_SUBSCRIPTION_FILTERS,
  isSubscriptionFiltersActive,
  subscriptionMatchesFilters,
  type SubscriptionFilters,
} from "./SubscriptionsFiltersPanel";
import { useTour } from "../../_shared/tours/useTour";
import {
  createSubscriptionAction,
  updateSubscriptionAction,
  updateSubscriptionStatusAction,
} from "./actions";
import type { AccountOption, SectionOption } from "../_shared/budgetPickerTypes";

const CADENCE_OPTIONS = ["monthly", "quarterly", "yearly", "every_n_weeks"] as const;
type Cadence = (typeof CADENCE_OPTIONS)[number];
const STATUS_OPTIONS = ["active", "paused", "canceled"] as const;
type SubscriptionStatusOption = (typeof STATUS_OPTIONS)[number];

export interface SubscriptionRow {
  id: string;
  name: string;
  payeeName: string;
  website: string | null;
  cadence: string;
  intervalWeeks: number | null;
  amount: string;
  renewalDate: string;
  autoRenew: boolean;
  accountId: string;
  accountName: string;
  accountCardExpirationDate: string | null;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
  trialEndDate: string | null;
  notes: string | null;
}

interface DraftState {
  name: string;
  payeeName: string;
  website: string;
  cadence: Cadence;
  intervalWeeks: string;
  amount: string;
  renewalDate: string;
  autoRenew: boolean;
  accountId: string;
  categoryId: string;
  status: SubscriptionStatusOption;
  trialEndDate: string;
  notes: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(accounts: AccountOption[]): DraftState {
  return {
    name: "",
    payeeName: "",
    website: "",
    cadence: "monthly",
    intervalWeeks: "4",
    amount: "",
    renewalDate: today(),
    autoRenew: true,
    accountId: accounts[0]?.id ?? "",
    categoryId: "",
    status: "active",
    trialEndDate: "",
    notes: "",
  };
}

function draftFromRow(row: SubscriptionRow): DraftState {
  return {
    name: row.name,
    payeeName: row.payeeName,
    website: row.website ?? "",
    cadence: row.cadence as Cadence,
    intervalWeeks: row.intervalWeeks ? String(row.intervalWeeks) : "4",
    amount: row.amount,
    renewalDate: row.renewalDate.slice(0, 10),
    autoRenew: row.autoRenew,
    accountId: row.accountId,
    categoryId: row.categoryId ?? "",
    status: row.status as SubscriptionStatusOption,
    trialEndDate: row.trialEndDate?.slice(0, 10) ?? "",
    notes: row.notes ?? "",
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

function monthlyEquivalent(row: SubscriptionRow): number {
  const amount = Number(row.amount) || 0;
  switch (row.cadence) {
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "every_n_weeks": {
      const weeks = row.intervalWeeks || 1;
      return (amount * (52 / weeks)) / 12;
    }
    default:
      return amount;
  }
}

function isCardExpiringSoon(cardExpirationDate: string | null): boolean {
  if (!cardExpirationDate) return false;
  const days = (new Date(cardExpirationDate).getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 30;
}

function draftToFormData(draft: DraftState): FormData {
  const fd = new FormData();
  fd.set("name", draft.name);
  fd.set("payeeName", draft.payeeName);
  fd.set("website", draft.website);
  fd.set("cadence", draft.cadence);
  if (draft.cadence === "every_n_weeks") fd.set("intervalWeeks", draft.intervalWeeks);
  fd.set("amount", stripAmountFormatting(draft.amount) || "0");
  fd.set("renewalDate", draft.renewalDate);
  if (draft.autoRenew) fd.set("autoRenew", "on");
  fd.set("accountId", draft.accountId);
  fd.set("categoryId", draft.categoryId);
  fd.set("status", draft.status);
  if (draft.trialEndDate) fd.set("trialEndDate", draft.trialEndDate);
  fd.set("notes", draft.notes);
  return fd;
}

function validateDraft(draft: DraftState): string | null {
  if (!draft.name.trim()) return "subscriptions.errors.nameRequired";
  if (!draft.payeeName.trim()) return "subscriptions.errors.payeeRequired";
  if (!(parseAmountInput(draft.amount) > 0)) return "subscriptions.errors.amountRequired";
  if (!draft.accountId) return "subscriptions.errors.accountRequired";
  if (!draft.renewalDate) return "subscriptions.errors.renewalDateRequired";
  if (draft.cadence === "every_n_weeks" && !(Number(draft.intervalWeeks) > 0)) {
    return "subscriptions.errors.intervalWeeksRequired";
  }
  return null;
}

export default function SubscriptionsPanel({
  canEdit,
  locale,
  currencyCode,
  accounts,
  sections,
  payees,
  subscriptions,
}: {
  canEdit: boolean;
  locale: string | null;
  currencyCode: string;
  accounts: AccountOption[];
  sections: SectionOption[];
  payees: string[];
  subscriptions: SubscriptionRow[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const { pending, run } = useServerAction();

  useTour("page:subscriptions", [
    {
      element: '[data-tour="subscriptions-summary"]',
      title: t("subscriptions.tour.summary.title"),
      description: t("subscriptions.tour.summary.description"),
      side: "bottom",
    },
    {
      element: '[data-tour="subscriptions-search"]',
      title: t("subscriptions.tour.search.title"),
      description: t("subscriptions.tour.search.description"),
      side: "bottom",
    },
  ]);
  const [, startTransition] = useTransition();
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SubscriptionFilters>(DEFAULT_SUBSCRIPTION_FILTERS);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const totalMonthlySpend = activeSubscriptions.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
  const totalYearlySpend = totalMonthlySpend * 12;

  const query = searchQuery.trim().toLowerCase();
  const filteredSubscriptions = subscriptions.filter((s) => {
    if (!subscriptionMatchesFilters(s, filters)) return false;
    if (!query) return true;
    return [s.name, s.accountName, s.categoryName, s.website].some((field) =>
      field?.toLowerCase().includes(query),
    );
  });

  const filteredActive = filteredSubscriptions.filter((s) => s.status === "active");
  const filteredPaused = filteredSubscriptions.filter((s) => s.status === "paused");
  const filteredCanceled = filteredSubscriptions.filter((s) => s.status === "canceled");

  const filterCategoryOptions = [
    { id: "", name: uncategorizedLabel },
    ...Array.from(
      new Map(
        subscriptions
          .filter((s) => s.categoryId !== null)
          .map((s) => [s.categoryId as string, s.categoryName as string]),
      ),
    ).map(([id, name]) => ({ id, name })),
  ];
  const filterAccountOptions = Array.from(
    new Map(subscriptions.map((s) => [s.accountId, s.accountName])),
  ).map(([id, name]) => ({ id, name }));

  function cadenceLabel(cadence: string): string {
    return td(t, `subscriptions.cadences.${cadence}`);
  }

  function statusLabel(status: string): string {
    return td(t, `subscriptions.statuses.${status}`);
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
          ? updateSubscriptionAction(id!, {}, draftToFormData(draft))
          : createSubscriptionAction({}, draftToFormData(draft)),
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

  function handleStatusChange(id: string, status: SubscriptionStatusOption) {
    startTransition(async () => {
      const result = await updateSubscriptionStatusAction(id, status);
      if (result.error) showToast(td(t, result.error), "error");
      router.refresh();
    });
  }

  function handleConfirmCancel() {
    if (!cancelTarget) return;
    const id = cancelTarget.id;
    setCancelTarget(null);
    handleStatusChange(id, "canceled");
  }

  function draftForm(
    draft: DraftState,
    setDraft: (d: DraftState) => void,
    onCancel: () => void,
    onSave: (andNew: boolean) => void,
    isEdit: boolean,
  ) {
    return (
      <Box
        style={{ backgroundColor: `${tokens.blue}0f` }}
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "8px", p: "20px", mb: "14px" }}
      >
        <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField
            size="small"
            label={t("subscriptions.form.name")}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            sx={{ flex: "1 1 220px" }}
          />
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
                label={t("subscriptions.form.payee")}
                placeholder={t("transactions.form.payeePlaceholder")}
              />
            )}
          />
          <TextField
            size="small"
            label={t("subscriptions.form.website")}
            value={draft.website}
            onChange={(e) => setDraft({ ...draft, website: e.target.value })}
            sx={{ flex: "1 1 220px" }}
          />
          <Box sx={{ flex: "1 1 220px" }}>
            {accountSelect(draft.accountId, (v) => setDraft({ ...draft, accountId: v }))}
          </Box>
          <Box sx={{ flex: "1 1 220px" }}>
            {categorySelect(draft.categoryId, (v) => setDraft({ ...draft, categoryId: v }))}
          </Box>
        </Stack>
        <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap", mb: 2, alignItems: "flex-start" }}>
          <TextField
            size="small"
            label={t("subscriptions.form.amount")}
            placeholder={t("transactions.form.amountPlaceholder")}
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            sx={{ flex: "1 1 140px" }}
            slotProps={{ htmlInput: { style: { textAlign: "right" } } }}
          />
          <TextField
            select
            size="small"
            label={t("budgetSettings.repeating.form.cadence")}
            value={draft.cadence}
            onChange={(e) => setDraft({ ...draft, cadence: e.target.value as Cadence })}
            sx={{ flex: "1 1 180px" }}
          >
            {CADENCE_OPTIONS.map((c) => (
              <MenuItem key={c} value={c}>
                {cadenceLabel(c)}
              </MenuItem>
            ))}
          </TextField>
          {draft.cadence === "every_n_weeks" && (
            <TextField
              size="small"
              type="number"
              label={t("subscriptions.form.everyNWeeks")}
              value={draft.intervalWeeks}
              onChange={(e) => setDraft({ ...draft, intervalWeeks: e.target.value })}
              sx={{ flex: "1 1 140px" }}
            />
          )}
          <TextField
            type="date"
            size="small"
            label={t("subscriptions.form.renewalDate")}
            value={draft.renewalDate}
            onChange={(e) => setDraft({ ...draft, renewalDate: e.target.value })}
            sx={{ flex: "1 1 190px" }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label={t("subscriptions.form.trialEndDate")}
            value={draft.trialEndDate}
            onChange={(e) => setDraft({ ...draft, trialEndDate: e.target.value })}
            sx={{ flex: "1 1 190px" }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            size="small"
            label={t("subscriptions.form.status")}
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as SubscriptionStatusOption })
            }
            sx={{ flex: "1 1 150px" }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap", mb: 2, alignItems: "center" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={draft.autoRenew}
                onChange={(e) => setDraft({ ...draft, autoRenew: e.target.checked })}
                size="small"
              />
            }
            label={t("subscriptions.form.autoRenew")}
            sx={{ "& .MuiFormControlLabel-label": { fontSize: 12.5, color: tokens.textBody } }}
          />
          <TextField
            size="small"
            label={t("subscriptions.form.notes")}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            sx={{ flex: "1 1 300px" }}
          />
        </Stack>

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
      </Box>
    );
  }

  function detailField(label: string, value: string) {
    return (
      <Box>
        <Typography sx={{ fontSize: 11, mb: "3px" }} style={{ color: tokens.textFaint }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 500 }} style={{ color: tokens.textBody }}>
          {value}
        </Typography>
      </Box>
    );
  }

  function detailLinkField(label: string, website: string) {
    const href = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    return (
      <Box>
        <Typography sx={{ fontSize: 11, mb: "3px" }} style={{ color: tokens.textFaint }}>
          {label}
        </Typography>
        <Typography
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          sx={{
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
          style={{ color: tokens.blue }}
        >
          {website}
        </Typography>
      </Box>
    );
  }

  function cadenceDetail(row: SubscriptionRow): string {
    if (row.cadence === "every_n_weeks") {
      return t("subscriptions.everyNWeeksValue", { weeks: row.intervalWeeks ?? 1 });
    }
    return cadenceLabel(row.cadence);
  }

  function renderRow(s: SubscriptionRow, isLast: boolean) {
    const expanded = expandedId === s.id;
    const editing = editingId === s.id && editDraft;
    const cardExpiring = isCardExpiringSoon(s.accountCardExpirationDate);

    return (
      <Box key={s.id} sx={{ borderBottom: isLast ? "none" : `1px solid ${tokens.border}` }}>
        <Stack
          direction="row"
          onClick={() => setExpandedId(expanded ? null : s.id)}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
            p: "13px 16px",
            cursor: "pointer",
            gap: 2,
          }}
          style={{ backgroundColor: cardExpiring ? `${tokens.amber}1f` : "transparent" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" sx={{ alignItems: "center", gap: "8px" }}>
              <Typography
                sx={{ fontSize: 13.5, fontWeight: 500 }}
                style={{ color: tokens.textBody }}
              >
                {s.name}
              </Typography>
              {cardExpiring && (
                <Chip
                  label={t("subscriptions.cardExpiringBadge")}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                  style={{ backgroundColor: tokens.amber, color: "#1b1400" }}
                />
              )}
            </Stack>
            <Typography sx={{ fontSize: 11.5, mt: "2px" }} style={{ color: tokens.textFaint }}>
              {[
                ...(s.payeeName !== s.name
                  ? [t("subscriptions.chargedAsSubtitle", { payeeName: s.payeeName })]
                  : []),
                s.categoryName ?? uncategorizedLabel,
                s.accountName,
                t(
                  s.autoRenew
                    ? "subscriptions.autoRenewOnSubtitle"
                    : "subscriptions.autoRenewOffSubtitle",
                ),
              ].join(" · ")}
            </Typography>
          </Box>
          <Stack direction="row" sx={{ alignItems: "center", gap: "10px", flex: "none" }}>
            <Box sx={{ textAlign: "right" }}>
              <Typography
                sx={{ fontSize: 13.5, fontWeight: 600 }}
                style={{ color: tokens.textBody }}
              >
                {formatCurrency(s.amount, locale, currencyCode)}
              </Typography>
              <Typography sx={{ fontSize: 11, mt: "2px" }} style={{ color: tokens.textFaint }}>
                {[
                  cadenceDetail(s),
                  t("subscriptions.renewsOn", {
                    date: formatDateOnly(s.renewalDate, { month: "short", day: "numeric" }),
                  }),
                ].join(" · ")}
              </Typography>
            </Box>
            <KeyboardArrowDownIcon
              sx={{
                fontSize: 20,
                transition: "transform .15s",
                transform: expanded ? "rotate(180deg)" : "none",
              }}
              style={{ color: tokens.textFaint }}
            />
          </Stack>
        </Stack>

        {expanded && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ p: "14px 16px 18px", borderTop: `1px solid ${tokens.border}` }}
            style={{ backgroundColor: tokens.pageBackground }}
          >
            {editing && editDraft ? (
              draftForm(
                editDraft,
                setEditDraft,
                () => {
                  setEditingId(null);
                  setEditDraft(null);
                },
                () => handleSave(false, editDraft, true, s.id),
                true,
              )
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                    gap: "16px 24px",
                    mb: "16px",
                  }}
                >
                  {detailField(
                    t("subscriptions.detail.amount"),
                    formatCurrency(s.amount, locale, currencyCode),
                  )}
                  {detailField(t("subscriptions.detail.payee"), s.payeeName)}
                  {detailField(t("subscriptions.detail.cadence"), cadenceDetail(s))}
                  {detailField(
                    t("subscriptions.detail.nextRenewal"),
                    formatDateOnly(s.renewalDate, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                  )}
                  {detailField(t("subscriptions.detail.account"), s.accountName)}
                  {detailField(
                    t("subscriptions.detail.category"),
                    s.categoryName ?? uncategorizedLabel,
                  )}
                  {detailField(t("subscriptions.detail.status"), statusLabel(s.status))}
                  {detailField(
                    t("subscriptions.detail.autoRenewal"),
                    t(
                      s.autoRenew
                        ? "subscriptions.autoRenewEnabled"
                        : "subscriptions.autoRenewDisabled",
                    ),
                  )}
                  {s.accountCardExpirationDate &&
                    detailField(
                      t("subscriptions.detail.cardExpiring"),
                      cardExpiring ? t("common.yes") : t("common.no"),
                    )}
                  {s.website && detailLinkField(t("subscriptions.detail.website"), s.website)}
                  {s.trialEndDate &&
                    detailField(
                      t("subscriptions.detail.trialEnd"),
                      formatDateOnly(s.trialEndDate, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }),
                    )}
                  {s.notes && detailField(t("subscriptions.detail.notes"), s.notes)}
                </Box>
                {canEdit && (
                  <Stack direction="row" sx={{ gap: 1 }}>
                    <AdminButton
                      onClick={() => {
                        setEditingId(s.id);
                        setEditDraft(draftFromRow(s));
                      }}
                    >
                      {t("common.edit")}
                    </AdminButton>
                    {s.status === "active" && (
                      <AdminButton onClick={() => handleStatusChange(s.id, "paused")}>
                        {t("subscriptions.pause")}
                      </AdminButton>
                    )}
                    {s.status === "paused" && (
                      <AdminButton onClick={() => handleStatusChange(s.id, "active")}>
                        {t("subscriptions.resume")}
                      </AdminButton>
                    )}
                    {s.status !== "canceled" && (
                      <AdminButton onClick={() => setCancelTarget({ id: s.id, name: s.name })}>
                        {t("subscriptions.cancel")}
                      </AdminButton>
                    )}
                  </Stack>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    );
  }

  function renderSection(labelKey: string, list: SubscriptionRow[]) {
    if (list.length === 0) return null;
    return (
      <Box sx={{ mb: "20px" }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            mb: "10px",
          }}
          style={{ color: tokens.textFaint }}
        >
          {td(t, labelKey, { count: list.length })}
        </Typography>
        <Box
          sx={{ borderRadius: "10px", overflow: "hidden" }}
          style={{ backgroundColor: tokens.cardBackground, border: `1px solid ${tokens.border}` }}
        >
          {list.map((s, i) => renderRow(s, i === list.length - 1))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: "20px 26px" }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}
      >
        <SectionHeader title={t("subscriptions.title")} subtitle={t("subscriptions.subtitle")} />
        {canEdit && !addOpen && !isMobile && (
          <AdminButton
            variant="contained"
            onClick={() => {
              setAddDraft(emptyDraft(accounts));
              setAddOpen(true);
            }}
          >
            <AddIcon sx={{ fontSize: 16, mr: "4px" }} />
            {t("subscriptions.addButton")}
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
          aria-label={t("subscriptions.addButton")}
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

      {subscriptions.length > 0 && (
        <Stack
          direction="row"
          data-tour="subscriptions-summary"
          sx={{ gap: "10px", mb: "20px", mt: "14px", flexWrap: "wrap" }}
        >
          {[
            [
              t("subscriptions.summary.monthlyTotal"),
              formatCurrency(totalMonthlySpend, locale, currencyCode),
            ],
            [
              t("subscriptions.summary.yearlyTotal"),
              formatCurrency(totalYearlySpend, locale, currencyCode),
            ],
            [t("subscriptions.summary.active"), String(activeSubscriptions.length)],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{ flex: "1 1 160px", borderRadius: "10px", p: "14px 16px" }}
              style={{
                backgroundColor: tokens.cardBackground,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <Typography sx={{ fontSize: 11.5, mb: "6px" }} style={{ color: tokens.textFaint }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 700 }} style={{ color: tokens.textBody }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {canEdit && addOpen && (
        <Box sx={{ mt: subscriptions.length > 0 ? 0 : "14px" }}>
          {draftForm(
            addDraft,
            setAddDraft,
            () => setAddOpen(false),
            (andNew) => handleSave(andNew, addDraft, false, null),
            false,
          )}
        </Box>
      )}

      {subscriptions.length === 0 && !addOpen && (
        <Typography sx={{ fontSize: 12.5, mt: 2 }} style={{ color: tokens.textDisabled }}>
          {t("subscriptions.empty")}
        </Typography>
      )}

      {subscriptions.length > 0 && (
        <Stack direction="row" data-tour="subscriptions-search" sx={{ gap: 1, mb: "16px" }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t("subscriptions.searchPlaceholder")}
            aria-label={t("subscriptions.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 320 }}
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
          <SubscriptionsFiltersPanel
            filters={filters}
            onChange={setFilters}
            categoryOptions={filterCategoryOptions}
            accountOptions={filterAccountOptions}
          />
        </Stack>
      )}

      {renderSection("subscriptions.sections.active", filteredActive)}
      {renderSection("subscriptions.sections.paused", filteredPaused)}
      {renderSection("subscriptions.sections.canceled", filteredCanceled)}

      {subscriptions.length > 0 &&
        filteredSubscriptions.length === 0 &&
        (query || isSubscriptionFiltersActive(filters)) && (
          <Typography sx={{ fontSize: 12.5, mt: 2 }} style={{ color: tokens.textDisabled }}>
            {t("subscriptions.noSearchResults")}
          </Typography>
        )}

      <ConfirmDialog
        open={cancelTarget !== null}
        title={t("subscriptions.cancelConfirmTitle")}
        description={
          cancelTarget
            ? t("subscriptions.cancelConfirmDescription", { name: cancelTarget.name })
            : ""
        }
        confirmLabel={t("subscriptions.cancel")}
        cancelLabel={t("common.back")}
        pending={pending}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />
    </Box>
  );
}
