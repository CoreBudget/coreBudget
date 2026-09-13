"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SectionHeader from "../../../../admin/_shared/SectionHeader";
import { useTokens } from "@/theme";
import { useServerAction } from "../../../../_shared/useServerAction";
import SettingsCard from "../../../../_shared/SettingsCard";
import { td } from "@/lib/i18n/translateDynamicKey";
import {
  setSidebarPageVisibilityAction,
  updateSidebarGroupOpenAction,
} from "../../../../_shared/sidebarActions";
import {
  DATE_PRESETS,
  SORT_COLUMNS,
  isDatePreset,
  isSortColumn,
  isSortDirection,
  type DatePreset,
  type SortColumn,
  type SortDirection,
} from "../../../accounts/[accountId]/viewPreference";
import {
  PAGE_PREFERENCE_KEY_LIST,
  PAGE_PREFERENCE_KEYS,
  type PageKey,
} from "@/lib/pagePreferenceKeys";
import { SIDEBAR_VISIBILITY_KEY_LIST, type SidebarPageKey } from "@/lib/sidebarVisibilityKeys";
import {
  setBudgetSectionsDefaultOpenAction,
  setDefaultLedgerDatePresetAction,
  setDefaultLedgerSortAction,
  setPagePreferenceAction,
  setPlanSectionsDefaultOpenAction,
} from "./actions";

const SELECTABLE_DATE_PRESETS = DATE_PRESETS.filter((p) => p !== "custom");

const PAGE_LABEL_KEYS: Record<PageKey, string> = {
  auditLog: "settings.preferences.pages.auditLog",
  liabilityDetail: "settings.preferences.pages.liabilityDetail",
  adminBackups: "settings.preferences.pages.adminBackups",
  adminJobHistory: "settings.preferences.pages.adminJobHistory",
  adminErrorLog: "settings.preferences.pages.adminErrorLog",
  adminHouseholds: "settings.preferences.pages.adminHouseholds",
  adminPayees: "settings.preferences.pages.adminPayees",
  adminPayeeDetail: "settings.preferences.pages.adminPayeeDetail",
  adminUsers: "settings.preferences.pages.adminUsers",
  adminUserDetail: "settings.preferences.pages.adminUserDetail",
};

const ADMIN_ONLY_PAGE_KEYS = new Set<PageKey>([
  "adminBackups",
  "adminJobHistory",
  "adminErrorLog",
  "adminHouseholds",
  "adminPayees",
  "adminPayeeDetail",
  "adminUsers",
  "adminUserDetail",
]);

const SIDEBAR_PAGE_LABEL_KEYS: Record<SidebarPageKey, string> = {
  dashboard: "settings.preferences.sidebarPages.dashboard",
  accountDetail: "settings.preferences.sidebarPages.accountDetail",
  budget: "settings.preferences.sidebarPages.budget",
  plan: "settings.preferences.sidebarPages.plan",
  netWorthList: "settings.preferences.sidebarPages.netWorthList",
  netWorthDetail: "settings.preferences.sidebarPages.netWorthDetail",
  reports: "settings.preferences.sidebarPages.reports",
  subscriptions: "settings.preferences.sidebarPages.subscriptions",
  incomeCalculator: "settings.preferences.sidebarPages.incomeCalculator",
  budgetSettings: "settings.preferences.sidebarPages.budgetSettings",
  settings: "settings.preferences.sidebarPages.settings",
  admin: "settings.preferences.sidebarPages.admin",
};

const SIDEBAR_PAGE_FEATURE_GATES: Partial<Record<SidebarPageKey, string | string[]>> = {
  accountDetail: "transactions",
  budget: "budget_envelope",
  plan: "plan",
  netWorthList: ["net_worth_assets", "net_worth_liabilities"],
  netWorthDetail: ["net_worth_assets", "net_worth_liabilities"],
  reports: "reports",
  subscriptions: "subscriptions",
  budgetSettings: "budget_settings",
};

function LabeledSwitch({
  checked,
  disabled,
  onChange,
  offLabel,
  onLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  offLabel: string;
  onLabel: string;
}) {
  const tokens = useTokens();
  return (
    <Stack direction="row" sx={{ alignItems: "center", gap: "6px" }}>
      <Typography
        sx={{ fontSize: 11, fontWeight: checked ? 400 : 600 }}
        style={{ color: checked ? tokens.textFaint : tokens.textBody }}
      >
        {offLabel}
      </Typography>
      <Switch checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <Typography
        sx={{ fontSize: 11, fontWeight: checked ? 600 : 400 }}
        style={{ color: checked ? tokens.textBody : tokens.textFaint }}
      >
        {onLabel}
      </Typography>
    </Stack>
  );
}

function Row({ label, control }: { label: string; control: ReactNode }) {
  const tokens = useTokens();
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        border: `1px solid ${tokens.border}`,
        borderRadius: "8px",
        p: "10px 14px",
        gap: 2,
      }}
    >
      <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textBody }}>
        {label}
      </Typography>
      {control}
    </Stack>
  );
}

export default function PreferencesPanel({
  isAdmin,
  permissions,
  sidebarAccountsOpen,
  sidebarNetWorthOpen,
  sidebarVisibilityByPage,
  defaultLedgerSortColumn,
  defaultLedgerSortDirection,
  defaultLedgerDatePreset,
  planSectionsDefaultOpen,
  budgetSectionsDefaultOpen,
  pagePreferences,
}: {
  isAdmin: boolean;
  permissions: Record<string, string> | null;
  sidebarAccountsOpen: boolean;
  sidebarNetWorthOpen: boolean;
  sidebarVisibilityByPage: Record<SidebarPageKey, boolean>;
  defaultLedgerSortColumn: string | null;
  defaultLedgerSortDirection: string | null;
  defaultLedgerDatePreset: string | null;
  planSectionsDefaultOpen: boolean;
  budgetSectionsDefaultOpen: boolean;
  pagePreferences: Record<PageKey, number>;
}) {
  const t = useTranslations("settings.preferences");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const router = useRouter();
  const { pending, run } = useServerAction();
  const [, startSidebarGroupTransition] = useTransition();

  const canSee = (feature: string) => (permissions ? permissions[feature] !== "no_access" : false);

  const sortColumn: SortColumn = isSortColumn(defaultLedgerSortColumn)
    ? defaultLedgerSortColumn
    : "date";
  const sortDirection: SortDirection = isSortDirection(defaultLedgerSortDirection)
    ? defaultLedgerSortDirection
    : "desc";
  const datePreset: DatePreset = isDatePreset(defaultLedgerDatePreset)
    ? defaultLedgerDatePreset
    : "allDates";

  function handleSidebarGroupToggle(group: "accounts" | "netWorth", open: boolean) {
    startSidebarGroupTransition(async () => {
      await updateSidebarGroupOpenAction(group, open);
      router.refresh();
    });
  }

  function handleSidebarVisibilityToggle(pageKey: SidebarPageKey, visible: boolean) {
    run(
      () => setSidebarPageVisibilityAction(pageKey, visible),
      () => router.refresh(),
    );
  }

  function handleSortColumnChange(nextColumn: SortColumn) {
    run(
      () => setDefaultLedgerSortAction(nextColumn, sortDirection),
      () => router.refresh(),
    );
  }

  function handleSortDirectionChange(nextDirection: SortDirection) {
    run(
      () => setDefaultLedgerSortAction(sortColumn, nextDirection),
      () => router.refresh(),
    );
  }

  function handleDatePresetChange(nextPreset: DatePreset) {
    run(
      () => setDefaultLedgerDatePresetAction(nextPreset),
      () => router.refresh(),
    );
  }

  function handlePlanSectionsToggle(open: boolean) {
    run(
      () => setPlanSectionsDefaultOpenAction(open),
      () => router.refresh(),
    );
  }

  function handleBudgetSectionsToggle(open: boolean) {
    run(
      () => setBudgetSectionsDefaultOpenAction(open),
      () => router.refresh(),
    );
  }

  function handlePageSizeChange(pageKey: PageKey, rowsPerPage: number) {
    run(
      () => setPagePreferenceAction(pageKey, rowsPerPage),
      () => router.refresh(),
    );
  }

  const visiblePageKeys = PAGE_PREFERENCE_KEY_LIST.filter((key) => {
    if (ADMIN_ONLY_PAGE_KEYS.has(key)) return isAdmin;
    if (key === "auditLog") return canSee("audit_log");
    if (key === "liabilityDetail") return canSee("net_worth_liabilities");
    return true;
  });

  const visibleSidebarPageKeys = SIDEBAR_VISIBILITY_KEY_LIST.filter((key) => {
    if (key === "admin") return isAdmin;
    const gate = SIDEBAR_PAGE_FEATURE_GATES[key];
    if (!gate) return true;
    return Array.isArray(gate) ? gate.some((g) => canSee(g)) : canSee(gate);
  });

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />

      <Box
        sx={{
          columns: { xs: "1", sm: "1", md: "2" },
          columnGap: "16px",
        }}
      >
        <SettingsCard
          title={t("sidebarCardTitle")}
          subtitle={t("sidebarCardSubtitle")}
          sx={{ p: "18px", mb: "16px", breakInside: "avoid" }}
          titleFontSize={14.5}
          titleColor={tokens.textPrimary}
          subtitleFontSize={12}
          subtitleColor={tokens.textFaint}
          subtitleMb="14px"
          contentGap="10px"
        >
          <Row
            label={t("sidebarAccountsLabel")}
            control={
              <LabeledSwitch
                checked={sidebarAccountsOpen}
                disabled={pending}
                onChange={(open) => handleSidebarGroupToggle("accounts", open)}
                offLabel={t("collapsedLabel")}
                onLabel={t("expandedLabel")}
              />
            }
          />
          <Row
            label={t("sidebarNetWorthLabel")}
            control={
              <LabeledSwitch
                checked={sidebarNetWorthOpen}
                disabled={pending}
                onChange={(open) => handleSidebarGroupToggle("netWorth", open)}
                offLabel={t("collapsedLabel")}
                onLabel={t("expandedLabel")}
              />
            }
          />
        </SettingsCard>

        <SettingsCard
          title={t("sidebarVisibilityCardTitle")}
          subtitle={t("sidebarVisibilityCardSubtitle")}
          sx={{ p: "18px", mb: "16px", breakInside: "avoid" }}
          titleFontSize={14.5}
          titleColor={tokens.textPrimary}
          subtitleFontSize={12}
          subtitleColor={tokens.textFaint}
          subtitleMb="14px"
          contentGap="10px"
        >
          {visibleSidebarPageKeys.map((key) => (
            <Row
              key={key}
              label={td(tRoot, SIDEBAR_PAGE_LABEL_KEYS[key])}
              control={
                <LabeledSwitch
                  checked={sidebarVisibilityByPage[key]}
                  disabled={pending}
                  onChange={(visible) => handleSidebarVisibilityToggle(key, visible)}
                  offLabel={t("collapsedLabel")}
                  onLabel={t("expandedLabel")}
                />
              }
            />
          ))}
        </SettingsCard>

        <SettingsCard
          title={t("transactionsCardTitle")}
          subtitle={t("transactionsCardSubtitle")}
          sx={{ p: "18px", mb: "16px", breakInside: "avoid" }}
          titleFontSize={14.5}
          titleColor={tokens.textPrimary}
          subtitleFontSize={12}
          subtitleColor={tokens.textFaint}
          subtitleMb="14px"
          contentGap="10px"
        >
          <Row
            label={t("defaultSortColumnLabel")}
            control={
              <TextField
                select
                size="small"
                value={sortColumn}
                disabled={pending}
                aria-label={t("defaultSortColumnLabel")}
                onChange={(e) => handleSortColumnChange(e.target.value as SortColumn)}
                sx={{ minWidth: 160 }}
              >
                {SORT_COLUMNS.map((column) => (
                  <MenuItem key={column} value={column}>
                    {td(tRoot, `transactions.table.columns.${column}`)}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
          <Row
            label={t("defaultSortDirectionLabel")}
            control={
              <TextField
                select
                size="small"
                value={sortDirection}
                disabled={pending}
                aria-label={t("defaultSortDirectionLabel")}
                onChange={(e) => handleSortDirectionChange(e.target.value as SortDirection)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="asc">{t("sortDirectionAscending")}</MenuItem>
                <MenuItem value="desc">{t("sortDirectionDescending")}</MenuItem>
              </TextField>
            }
          />
          <Row
            label={t("defaultDateRangeLabel")}
            control={
              <TextField
                select
                size="small"
                value={datePreset}
                disabled={pending}
                aria-label={t("defaultDateRangeLabel")}
                onChange={(e) => handleDatePresetChange(e.target.value as DatePreset)}
                sx={{ minWidth: 160 }}
              >
                {SELECTABLE_DATE_PRESETS.map((preset) => (
                  <MenuItem key={preset} value={preset}>
                    {td(tRoot, `transactions.viewFilters.presets.${preset}`)}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
        </SettingsCard>

        <SettingsCard
          title={t("planCardTitle")}
          subtitle={t("planCardSubtitle")}
          sx={{ p: "18px", mb: "16px", breakInside: "avoid" }}
          titleFontSize={14.5}
          titleColor={tokens.textPrimary}
          subtitleFontSize={12}
          subtitleColor={tokens.textFaint}
          subtitleMb="14px"
          contentGap="10px"
        >
          <Row
            label={t("planSectionsDefaultOpenLabel")}
            control={
              <LabeledSwitch
                checked={planSectionsDefaultOpen}
                disabled={pending}
                onChange={(open) => handlePlanSectionsToggle(open)}
                offLabel={t("collapsedLabel")}
                onLabel={t("expandedLabel")}
              />
            }
          />
        </SettingsCard>

        <SettingsCard
          title={t("budgetCardTitle")}
          subtitle={t("budgetCardSubtitle")}
          sx={{ p: "18px", mb: "16px", breakInside: "avoid" }}
          titleFontSize={14.5}
          titleColor={tokens.textPrimary}
          subtitleFontSize={12}
          subtitleColor={tokens.textFaint}
          subtitleMb="14px"
          contentGap="10px"
        >
          <Row
            label={t("budgetSectionsDefaultOpenLabel")}
            control={
              <LabeledSwitch
                checked={budgetSectionsDefaultOpen}
                disabled={pending}
                onChange={(open) => handleBudgetSectionsToggle(open)}
                offLabel={t("collapsedLabel")}
                onLabel={t("expandedLabel")}
              />
            }
          />
        </SettingsCard>

        <SettingsCard
          title={t("paginationCardTitle")}
          subtitle={t("paginationCardSubtitle")}
          sx={{ p: "18px", mb: "16px", breakInside: "avoid" }}
          titleFontSize={14.5}
          titleColor={tokens.textPrimary}
          subtitleFontSize={12}
          subtitleColor={tokens.textFaint}
          subtitleMb="14px"
          contentGap="10px"
        >
          {visiblePageKeys.length === 0 ? (
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
              {t("paginationEmpty")}
            </Typography>
          ) : (
            visiblePageKeys.map((key) => (
              <Row
                key={key}
                label={td(tRoot, PAGE_LABEL_KEYS[key])}
                control={
                  <TextField
                    select
                    size="small"
                    value={pagePreferences[key]}
                    disabled={pending}
                    aria-label={td(tRoot, PAGE_LABEL_KEYS[key])}
                    onChange={(e) => handlePageSizeChange(key, Number(e.target.value))}
                    sx={{ minWidth: 100 }}
                  >
                    {PAGE_PREFERENCE_KEYS[key].options.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </TextField>
                }
              />
            ))
          )}
        </SettingsCard>
      </Box>
    </Box>
  );
}
