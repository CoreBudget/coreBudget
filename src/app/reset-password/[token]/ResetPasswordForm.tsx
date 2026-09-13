"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import AuthShell from "../../_shared/AuthShell";
import AuthHeading from "../../_shared/AuthHeading";
import Field from "../../_shared/Field";
import { resetPassword, type ResetPasswordState } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

const initialState: ResetPasswordState = {};

export default function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <AuthShell maxWidth={420}>
      <AuthHeading
        title={t("auth.resetPassword.title")}
        subtitle={t("auth.resetPassword.subtitle")}
      />
      <Stack component="form" action={formAction} sx={{ gap: 2 }}>
        <input type="hidden" name="token" value={token} />
        <Field label={t("auth.resetPassword.newPasswordLabel")} htmlFor="password">
          <TextField
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.shared.passwordPlaceholderMin8")}
            autoComplete="new-password"
            autoFocus
            required
            fullWidth
          />
        </Field>
        <Field label={t("auth.resetPassword.confirmNewPasswordLabel")} htmlFor="confirmPassword">
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
        {state.error && <Alert severity="error">{td(t, state.error)}</Alert>}
        <Button type="submit" variant="contained" fullWidth disabled={pending}>
          {t("auth.resetPassword.submitButton")}
        </Button>
      </Stack>
    </AuthShell>
  );
}
