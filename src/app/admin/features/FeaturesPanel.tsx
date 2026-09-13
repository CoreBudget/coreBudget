"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { Feature } from "@/generated/prisma/client";
import SectionHeader from "../_shared/SectionHeader";
import { useToast } from "../../_shared/ToastProvider";
import { useServerAction } from "../../_shared/useServerAction";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";
import { setFeatureToggleAction } from "./actions";

const TOGGLES: { feature: Feature; labelKey: string; descriptionKey: string }[] = [
  {
    feature: "budget_envelope",
    labelKey: "appShell.nav.budget",
    descriptionKey: "admin.features.descriptions.budget",
  },
  {
    feature: "plan",
    labelKey: "appShell.nav.plan",
    descriptionKey: "admin.features.descriptions.plan",
  },
  {
    feature: "transactions",
    labelKey: "appShell.nav.accountsGroup",
    descriptionKey: "admin.features.descriptions.transactions",
  },
  {
    feature: "net_worth_assets",
    labelKey: "appShell.nav.assets",
    descriptionKey: "admin.features.descriptions.netWorthAssets",
  },
  {
    feature: "net_worth_liabilities",
    labelKey: "appShell.nav.liabilities",
    descriptionKey: "admin.features.descriptions.netWorthLiabilities",
  },
  {
    feature: "reports",
    labelKey: "appShell.nav.reports",
    descriptionKey: "admin.features.descriptions.reports",
  },
  {
    feature: "subscriptions",
    labelKey: "appShell.nav.subscriptions",
    descriptionKey: "admin.features.descriptions.subscriptions",
  },
  {
    feature: "repeating_transactions",
    labelKey: "budgetSettings.layout.tabs.repeatingTransactions",
    descriptionKey: "admin.features.descriptions.repeatingTransactions",
  },
  {
    feature: "audit_log",
    labelKey: "budgetSettings.layout.tabs.auditLog",
    descriptionKey: "admin.features.descriptions.auditLog",
  },
  {
    feature: "income_calculator",
    labelKey: "appShell.nav.incomeCalculator",
    descriptionKey: "admin.features.descriptions.incomeCalculator",
  },
];

export default function FeaturesPanel({ toggles }: { toggles: Record<Feature, boolean> }) {
  const t = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(toggles);
  const { pending, run } = useServerAction();

  function handleToggle(feature: Feature, next: boolean) {
    setEnabled((prev) => ({ ...prev, [feature]: next }));
    run(
      () => setFeatureToggleAction(feature, next),
      undefined,
      (err) => {
        setEnabled((prev) => ({ ...prev, [feature]: !next }));
        showToast(td(t, err), "error");
      },
    );
  }

  return (
    <Box>
      <SectionHeader title={t("admin.features.title")} subtitle={t("admin.features.subtitle")} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: "14px",
        }}
      >
        {TOGGLES.map(({ feature, labelKey, descriptionKey }) => {
          const isOn = enabled[feature];
          return (
            <Box
              key={feature}
              sx={{
                border: `1px solid ${tokens.border}`,
                borderRadius: "10px",
                p: "16px 18px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
              }}
              style={{ backgroundColor: tokens.cardBackground }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{ fontSize: 14, fontWeight: 700, mb: "4px" }}
                  style={{ color: tokens.textBody }}
                >
                  {td(t, labelKey)}
                </Typography>
                <Typography
                  sx={{ fontSize: 12, lineHeight: 1.5 }}
                  style={{ color: tokens.textMuted }}
                >
                  {td(t, descriptionKey)}
                </Typography>
              </Box>
              <Stack sx={{ alignItems: "center", flex: "none" }}>
                <Switch
                  checked={isOn}
                  disabled={pending}
                  onChange={(e) => handleToggle(feature, e.target.checked)}
                />
                <Typography
                  sx={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", mt: "-2px" }}
                  style={{ color: isOn ? tokens.green : tokens.textFaint }}
                >
                  {isOn ? t("admin.features.onLabel") : t("admin.features.offLabel")}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
