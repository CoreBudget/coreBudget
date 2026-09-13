"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import { useTokens } from "@/theme";
import { useToast } from "../../../_shared/ToastProvider";
import { useServerAction } from "../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { setNotificationPreferenceAction } from "./actions";
import {
  getVapidPublicKeyAction,
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from "./pushActions";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export interface NotificationPreferenceRow {
  notificationType: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
}

const TYPE_ORDER = [
  "uncategorized_transactions",
  "needs_review",
  "over_budget",
  "reconciliation_due",
  "card_expiring",
];

const TYPE_LABEL_KEYS: Record<string, string> = {
  uncategorized_transactions: "settings.notifications.types.uncategorizedTransactions",
  needs_review: "settings.notifications.types.needsReview",
  over_budget: "settings.notifications.types.overBudget",
  reconciliation_due: "settings.notifications.types.reconciliationDue",
  card_expiring: "settings.notifications.types.cardExpiring",
};

const TYPE_DESCRIPTION_KEYS: Record<string, string> = {
  uncategorized_transactions: "settings.notifications.descriptions.uncategorizedTransactions",
  needs_review: "settings.notifications.descriptions.needsReview",
  over_budget: "settings.notifications.descriptions.overBudget",
  reconciliation_due: "settings.notifications.descriptions.reconciliationDue",
  card_expiring: "settings.notifications.descriptions.cardExpiring",
};

export default function NotificationSettingsPanel({
  preferences,
}: {
  preferences: NotificationPreferenceRow[];
}) {
  const t = useTranslations("settings.notifications");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const { pending, run } = useServerAction();
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushSupported] = useState(
    () =>
      typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
  );
  const [pushPending, startPushTransition] = useTransition();

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setPushSubscribed(!!subscription))
      .catch(() => {});
  }, [pushSupported]);

  function togglePush(enabled: boolean) {
    startPushTransition(async () => {
      const registration = await navigator.serviceWorker.ready;

      if (!enabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await deletePushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setPushSubscribed(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast(
          td(tRoot, "settings.notifications.pushSubscription.errors.permissionDenied"),
          "error",
        );
        return;
      }

      const publicKey = await getVapidPublicKeyAction();
      if (!publicKey) {
        showToast(
          td(tRoot, "settings.notifications.pushSubscription.errors.notConfigured"),
          "error",
        );
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      await savePushSubscriptionAction(
        subscription.endpoint,
        json.keys?.p256dh ?? "",
        json.keys?.auth ?? "",
        navigator.userAgent,
      );
      setPushSubscribed(true);
    });
  }

  function handleToggle(
    notificationType: string,
    field: "inAppEnabled" | "pushEnabled",
    value: boolean,
  ) {
    run(
      () => setNotificationPreferenceAction(notificationType, field, value),
      () => router.refresh(),
    );
  }

  const ordered = TYPE_ORDER.map((type) =>
    preferences.find((p) => p.notificationType === type),
  ).filter((p): p is NotificationPreferenceRow => !!p);

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} />

      {pushSupported && (
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            border: `1px solid ${tokens.border}`,
            borderRadius: "10px",
            p: "14px 16px",
            mb: "14px",
            gap: 2,
          }}
          style={{ backgroundColor: tokens.cardBackground }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} style={{ color: tokens.textBody }}>
              {t("pushSubscription.title")}
            </Typography>
            <Typography sx={{ fontSize: 11.5, mt: "2px" }} style={{ color: tokens.textMuted }}>
              {t("pushSubscription.subtitle")}
            </Typography>
          </Box>
          <Switch
            checked={pushSubscribed}
            disabled={pushPending}
            onChange={(e) => togglePush(e.target.checked)}
            slotProps={{ input: { "aria-label": t("pushSubscription.toggleAriaLabel") } }}
          />
        </Stack>
      )}

      <Stack sx={{ gap: "10px" }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "flex-end", gap: "28px", pr: { xs: "8px", sm: "20px" } }}
        >
          <Typography
            sx={{ fontSize: 11, width: 56, textAlign: "center" }}
            style={{ color: tokens.textFaint }}
          >
            {t("inAppColumnLabel")}
          </Typography>
          <Typography
            sx={{ fontSize: 11, width: 56, textAlign: "center" }}
            style={{ color: tokens.textFaint }}
          >
            {t("pushColumnLabel")}
          </Typography>
        </Stack>

        {ordered.map((pref) => (
          <Stack
            key={pref.notificationType}
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${tokens.border}`,
              borderRadius: "10px",
              p: "14px 16px",
              gap: 2,
            }}
            style={{ backgroundColor: tokens.cardBackground }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: 13.5, fontWeight: 600 }}
                style={{ color: tokens.textBody }}
              >
                {td(tRoot, TYPE_LABEL_KEYS[pref.notificationType])}
              </Typography>
              <Typography sx={{ fontSize: 11.5, mt: "2px" }} style={{ color: tokens.textMuted }}>
                {td(tRoot, TYPE_DESCRIPTION_KEYS[pref.notificationType])}
              </Typography>
            </Box>
            <Stack direction="row" sx={{ gap: "28px", flex: "none" }}>
              <Box sx={{ width: 56, display: "flex", justifyContent: "center" }}>
                <Switch
                  checked={pref.inAppEnabled}
                  disabled={pending}
                  onChange={(e) =>
                    handleToggle(pref.notificationType, "inAppEnabled", e.target.checked)
                  }
                  slotProps={{
                    input: {
                      "aria-label": t("inAppToggleAriaLabel", {
                        type: td(tRoot, TYPE_LABEL_KEYS[pref.notificationType]),
                      }),
                    },
                  }}
                />
              </Box>
              <Box sx={{ width: 56, display: "flex", justifyContent: "center" }}>
                <Switch
                  checked={pref.pushEnabled}
                  disabled={pending}
                  onChange={(e) =>
                    handleToggle(pref.notificationType, "pushEnabled", e.target.checked)
                  }
                  slotProps={{
                    input: {
                      "aria-label": t("pushToggleAriaLabel", {
                        type: td(tRoot, TYPE_LABEL_KEYS[pref.notificationType]),
                      }),
                    },
                  }}
                />
              </Box>
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
