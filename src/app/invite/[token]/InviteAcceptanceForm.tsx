"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AuthShell from "../../_shared/AuthShell";
import AuthHeading from "../../_shared/AuthHeading";
import Field from "../../_shared/Field";
import { acceptInvite, type AcceptInviteState } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

const initialState: AcceptInviteState = {};

export default function InviteAcceptanceForm({
  token,
  name,
  qrDataUrl,
  secret,
}: {
  token: string;
  name: string;
  qrDataUrl: string;
  secret: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(acceptInvite, initialState);

  return (
    <AuthShell maxWidth={440}>
      <AuthHeading
        title={t("auth.invite.welcomeTitle", { name })}
        subtitle={t("auth.invite.subtitle")}
      />
      <Stack component="form" action={formAction} sx={{ gap: 2 }}>
        <input type="hidden" name="token" value={token} />

        <Field label={t("auth.shared.passwordLabel")} htmlFor="password">
          <TextField
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.shared.passwordPlaceholderMin8")}
            autoComplete="new-password"
            required
            fullWidth
          />
        </Field>
        <Field label={t("auth.shared.confirmPasswordLabel")} htmlFor="confirmPassword">
          <TextField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder={t("auth.shared.confirmPasswordPlaceholder")}
            autoComplete="new-password"
            required
            fullWidth
          />
        </Field>

        <Stack sx={{ gap: 1, alignItems: "center", textAlign: "center", my: 1 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {t("auth.invite.scanInstructions")}
          </Typography>
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI, not an optimizable remote image */}
          <img
            src={qrDataUrl}
            alt={t("auth.shared.totpQrAlt")}
            width={160}
            height={160}
            style={{ borderRadius: 6 }}
          />
          <Typography sx={{ fontSize: 11.5, color: "text.disabled", wordBreak: "break-all" }}>
            {t("auth.shared.manualKeyEntry", { secret })}
          </Typography>
        </Stack>

        <Field label={t("auth.shared.sixDigitCodeLabel")} htmlFor="code">
          <TextField
            id="code"
            name="code"
            placeholder={t("auth.shared.codePlaceholder")}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            fullWidth
            slotProps={{
              htmlInput: {
                maxLength: 6,
                pattern: "\\d{6}",
                style: { letterSpacing: 4, fontSize: 18, textAlign: "center" },
              },
            }}
          />
        </Field>

        {state.error && <Alert severity="error">{td(t, state.error)}</Alert>}

        <Button type="submit" variant="contained" fullWidth disabled={pending}>
          {t("auth.invite.submitButton")}
        </Button>
      </Stack>
    </AuthShell>
  );
}
