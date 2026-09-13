"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import SectionHeader from "../_shared/SectionHeader";
import Field from "../../_shared/Field";
import { useToast } from "../../_shared/ToastProvider";
import SettingsCard from "../../_shared/SettingsCard";
import ConfirmDialog from "../../_shared/ConfirmDialog";
import { updateLocalizationAction, updateSmtpAction, regenerateVapidKeysAction } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

const LANGUAGES = [
  { code: "en", labelKey: "admin.settings.languages.english" },
  { code: "es", labelKey: "admin.settings.languages.spanish" },
  { code: "fr", labelKey: "admin.settings.languages.french" },
  { code: "de", labelKey: "admin.settings.languages.german" },
  { code: "pt", labelKey: "admin.settings.languages.portuguese" },
] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

const SESSION_TIMEOUTS = [
  { minutes: 15, labelKey: "admin.settings.sessionTimeouts.minutes15" },
  { minutes: 30, labelKey: "admin.settings.sessionTimeouts.minutes30" },
  { minutes: 60, labelKey: "admin.settings.sessionTimeouts.hours1" },
  { minutes: 240, labelKey: "admin.settings.sessionTimeouts.hours4" },
  { minutes: 480, labelKey: "admin.settings.sessionTimeouts.hours8" },
  { minutes: 1440, labelKey: "admin.settings.sessionTimeouts.hours24" },
  { minutes: 10080, labelKey: "admin.settings.sessionTimeouts.days7" },
  { minutes: 43200, labelKey: "admin.settings.sessionTimeouts.days30" },
] as const;

interface Settings {
  defaultLocale: string;
  currencyCode: string;
  sessionTimeoutMinutes: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFromAddress: string | null;
  smtpConfigured: boolean;
  vapidPublicKey: string | null;
}

export default function SettingsPanel({ settings }: { settings: Settings }) {
  const { showToast } = useToast();
  const t = useTranslations();
  const [localizationPending, startLocalizationTransition] = useTransition();
  const [smtpPending, startSmtpTransition] = useTransition();
  const [vapidPending, startVapidTransition] = useTransition();
  const [vapidPublicKey, setVapidPublicKey] = useState(settings.vapidPublicKey);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

  const [defaultLocale, setDefaultLocale] = useState(settings.defaultLocale);
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(
    settings.sessionTimeoutMinutes,
  );
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort?.toString() ?? "");
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser ?? "");
  const [smtpFromAddress, setSmtpFromAddress] = useState(settings.smtpFromAddress ?? "");

  function handleRegenerateVapidKeys() {
    setConfirmRegenerateOpen(false);
    startVapidTransition(async () => {
      const result = await regenerateVapidKeysAction();
      const key = (result.error ?? result.message ?? "admin.settings.messages.saved") as Parameters<
        typeof t
      >[0];
      showToast(t(key), result.error ? "error" : "success");
      if (result.publicKey) setVapidPublicKey(result.publicKey);
    });
  }

  function handleLocalizationSubmit(formData: FormData) {
    startLocalizationTransition(async () => {
      const result = await updateLocalizationAction({}, formData);
      const key = (result.error ?? result.message ?? "admin.settings.messages.saved") as Parameters<
        typeof t
      >[0];
      showToast(t(key), result.error ? "error" : "success");
    });
  }

  function handleSmtpSubmit(formData: FormData) {
    startSmtpTransition(async () => {
      const result = await updateSmtpAction({}, formData);
      const key = (result.error ?? result.message ?? "admin.settings.messages.saved") as Parameters<
        typeof t
      >[0];
      showToast(t(key), result.error ? "error" : "success");
    });
  }

  return (
    <Box>
      <SectionHeader title={t("admin.settings.title")} subtitle={t("admin.settings.subtitle")} />

      <Box
        sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}
      >
        <Stack component="form" action={handleLocalizationSubmit} sx={{ gap: 2 }}>
          <SettingsCard
            title={t("admin.settings.localization.title")}
            subtitle={t("admin.settings.localization.subtitle")}
          >
            <Field
              label={t("admin.settings.localization.defaultLanguageLabel")}
              htmlFor="defaultLocale"
            >
              <TextField
                id="defaultLocale"
                name="defaultLocale"
                select
                fullWidth
                size="small"
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <MenuItem key={l.code} value={l.code}>
                    {td(t, l.labelKey)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field label={t("admin.settings.localization.currencyLabel")} htmlFor="currencyCode">
              <TextField
                id="currencyCode"
                name="currencyCode"
                select
                fullWidth
                size="small"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field
              label={t("admin.settings.localization.sessionTimeoutLabel")}
              htmlFor="sessionTimeoutMinutes"
            >
              <TextField
                id="sessionTimeoutMinutes"
                name="sessionTimeoutMinutes"
                select
                fullWidth
                size="small"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
              >
                {SESSION_TIMEOUTS.map((opt) => (
                  <MenuItem key={opt.minutes} value={opt.minutes}>
                    {td(t, opt.labelKey)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Button
              type="submit"
              variant="contained"
              disabled={localizationPending}
              sx={{ alignSelf: "flex-start" }}
            >
              {t("common.save")}
            </Button>
          </SettingsCard>
        </Stack>

        <Stack component="form" action={handleSmtpSubmit} sx={{ gap: 2 }}>
          <SettingsCard
            title={t("admin.settings.smtp.title")}
            subtitle={t("admin.settings.smtp.subtitle")}
          >
            <Field label={t("admin.settings.smtp.hostLabel")} htmlFor="smtpHost">
              <TextField
                id="smtpHost"
                name="smtpHost"
                size="small"
                fullWidth
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </Field>
            <Field label={t("admin.settings.smtp.portLabel")} htmlFor="smtpPort">
              <TextField
                id="smtpPort"
                name="smtpPort"
                type="number"
                size="small"
                fullWidth
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </Field>
            <Field label={t("admin.settings.smtp.usernameLabel")} htmlFor="smtpUser">
              <TextField
                id="smtpUser"
                name="smtpUser"
                size="small"
                fullWidth
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </Field>
            <Field
              label={
                settings.smtpConfigured
                  ? t("admin.settings.smtp.passwordLabelConfigured")
                  : t("admin.settings.smtp.passwordLabel")
              }
              htmlFor="smtpPassword"
            >
              <TextField
                id="smtpPassword"
                name="smtpPassword"
                type="password"
                size="small"
                fullWidth
              />
            </Field>
            <Field label={t("admin.settings.smtp.fromAddressLabel")} htmlFor="smtpFromAddress">
              <TextField
                id="smtpFromAddress"
                name="smtpFromAddress"
                size="small"
                fullWidth
                value={smtpFromAddress}
                onChange={(e) => setSmtpFromAddress(e.target.value)}
              />
            </Field>

            <Button
              type="submit"
              variant="contained"
              disabled={smtpPending}
              sx={{ alignSelf: "flex-start" }}
            >
              {t("admin.settings.smtp.submit")}
            </Button>
          </SettingsCard>
        </Stack>

        <Stack sx={{ gap: 2, gridColumn: "1 / -1" }}>
          <SettingsCard
            title={t("admin.settings.webPush.title")}
            subtitle={t("admin.settings.webPush.subtitle")}
          >
            <Field label={t("admin.settings.webPush.publicKeyLabel")} htmlFor="vapidPublicKey">
              <TextField
                id="vapidPublicKey"
                size="small"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                value={vapidPublicKey ?? t("admin.settings.webPush.notConfigured")}
              />
            </Field>

            <Button
              variant="contained"
              disabled={vapidPending}
              onClick={() => setConfirmRegenerateOpen(true)}
              sx={{ alignSelf: "flex-start" }}
            >
              {vapidPublicKey
                ? t("admin.settings.webPush.regenerate")
                : t("admin.settings.webPush.generate")}
            </Button>
          </SettingsCard>
        </Stack>
      </Box>

      <ConfirmDialog
        open={confirmRegenerateOpen}
        title={t("admin.settings.webPush.confirmTitle")}
        description={t("admin.settings.webPush.confirmBody")}
        confirmLabel={t("admin.settings.webPush.confirmAction")}
        cancelLabel={t("common.cancel")}
        pending={vapidPending}
        onCancel={() => setConfirmRegenerateOpen(false)}
        onConfirm={handleRegenerateVapidKeys}
      />
    </Box>
  );
}
