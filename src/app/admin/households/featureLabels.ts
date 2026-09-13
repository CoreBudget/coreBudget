import type { useTranslations } from "next-intl";
import { Feature } from "@/generated/prisma/enums";
import { td } from "@/lib/i18n/translateDynamicKey";

type Translate = ReturnType<typeof useTranslations>;

/// Per-budget, per-user grantable features. income_calculator is a platform-wide toggle
/// (see admin/features), not a FeaturePermission, so it is deliberately excluded here; this is
/// the single source of truth other than the schema, used by both the permission matrix UI and
/// the savePermissionsAction validation so the two can't drift apart.
export const PER_BUDGET_FEATURES = Object.values(Feature).filter(
  (f) => f !== Feature.income_calculator,
);

const FEATURE_LABEL_KEYS: Record<string, string> = {
  transactions: "admin.households.features.transactions",
  budget_envelope: "admin.households.features.budgetEnvelope",
  plan: "admin.households.features.plan",
  net_worth_assets: "admin.households.features.netWorthAssets",
  net_worth_liabilities: "admin.households.features.netWorthLiabilities",
  reports: "admin.households.features.reports",
  repeating_transactions: "admin.households.features.repeatingTransactions",
  subscriptions: "admin.households.features.subscriptions",
  budget_settings: "admin.households.features.budgetSettings",
  audit_log: "admin.households.features.auditLog",
};

const LEVEL_LABEL_KEYS: Record<string, string> = {
  no_access: "admin.households.permissionLevels.noAccess",
  read_only: "admin.households.permissionLevels.readOnly",
  edit: "admin.households.permissionLevels.edit",
};

export function featureLabel(t: Translate, feature: string): string {
  const key = FEATURE_LABEL_KEYS[feature];
  return key ? td(t, key) : feature;
}

export function levelLabel(t: Translate, level: string): string {
  const key = LEVEL_LABEL_KEYS[level];
  return key ? td(t, key) : level;
}

export function permissionSummary(t: Translate, permissions: Record<string, string>): string {
  const counts = { edit: 0, read_only: 0, no_access: 0 };
  for (const level of Object.values(permissions)) {
    if (level in counts) counts[level as keyof typeof counts]++;
  }
  return td(t, "admin.households.permissionSummary", {
    edit: counts.edit,
    readOnly: counts.read_only,
    noAccess: counts.no_access,
  });
}
