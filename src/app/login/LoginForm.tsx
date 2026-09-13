"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AuthShell from "../_shared/AuthShell";
import AuthHeading from "../_shared/AuthHeading";
import Field from "../_shared/Field";
import { submitCredentials, submitTotp, submitEnroll, type LoginActionState } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

const initialState: LoginActionState = { step: "credentials" };

export default function LoginForm() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [credentialsState, credentialsAction, credentialsPending] = useActionState(
    submitCredentials,
    initialState,
  );
  const [totpState, totpAction, totpPending] = useActionState(submitTotp, initialState);
  const [enrollState, enrollAction, enrollPending] = useActionState(submitEnroll, initialState);

  const step =
    [credentialsState, totpState, enrollState].find((s) => s.step !== "credentials")?.step ??
    "credentials";

  return (
    <AuthShell maxWidth={420}>
      {step === "credentials" && (
        <>
          <AuthHeading title={t("auth.login.title")} subtitle={t("auth.login.subtitle")} />
          <Stack component="form" action={credentialsAction} sx={{ gap: 2 }}>
            <input type="hidden" name="next" value={next} />
            <Field label={t("auth.login.emailLabel")} htmlFor="email">
              <TextField
                id="email"
                name="email"
                type="email"
                placeholder={t("auth.login.emailPlaceholder")}
                autoComplete="email"
                autoFocus
                required
                fullWidth
              />
            </Field>
            <Field label={t("auth.shared.passwordLabel")} htmlFor="password">
              <TextField
                id="password"
                name="password"
                type="password"
                placeholder={t("auth.login.passwordPlaceholder")}
                autoComplete="current-password"
                required
                fullWidth
              />
            </Field>
            {credentialsState.error && (
              <Alert severity="error">{td(t, credentialsState.error)}</Alert>
            )}
            <Button type="submit" variant="contained" fullWidth disabled={credentialsPending}>
              {t("auth.login.submitButton")}
            </Button>
          </Stack>
        </>
      )}

      {step === "totp" && (
        <>
          <AuthHeading title={t("auth.login.totpTitle")} subtitle={t("auth.login.totpSubtitle")} />
          <Stack component="form" action={totpAction} sx={{ gap: 2 }}>
            <input type="hidden" name="next" value={next} />
            <Field label={t("auth.login.verificationCodeLabel")} htmlFor="code">
              <TextField
                id="code"
                name="code"
                placeholder={t("auth.shared.codePlaceholder")}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
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
            {totpState.error && <Alert severity="error">{td(t, totpState.error)}</Alert>}
            <FormControlLabel
              control={<Checkbox name="rememberDevice" defaultChecked size="small" />}
              label={t("auth.shared.rememberDevice")}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 12.5, color: "text.secondary" } }}
            />
            <Button type="submit" variant="contained" fullWidth disabled={totpPending}>
              {t("auth.login.verifyButton")}
            </Button>
          </Stack>
        </>
      )}

      {step === "enroll" && (
        <>
          <AuthHeading
            title={t("auth.login.enrollTitle")}
            subtitle={t("auth.login.enrollSubtitle")}
          />
          <Stack component="form" action={enrollAction} sx={{ gap: 2 }}>
            <input type="hidden" name="next" value={next} />
            <Stack sx={{ gap: 1, alignItems: "center", textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI, not an optimizable remote image */}
              <img
                src={enrollState.enrollQrDataUrl}
                alt={t("auth.shared.totpQrAlt")}
                width={160}
                height={160}
                style={{ borderRadius: 6 }}
              />
              <Typography sx={{ fontSize: 11.5, color: "text.disabled", wordBreak: "break-all" }}>
                {t("auth.shared.manualKeyEntry", { secret: enrollState.enrollSecret ?? "" })}
              </Typography>
            </Stack>
            <Field label={t("auth.login.verificationCodeLabel")} htmlFor="code">
              <TextField
                id="code"
                name="code"
                placeholder={t("auth.shared.codePlaceholder")}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
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
            {enrollState.error && <Alert severity="error">{td(t, enrollState.error)}</Alert>}
            <FormControlLabel
              control={<Checkbox name="rememberDevice" defaultChecked size="small" />}
              label={t("auth.shared.rememberDevice")}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 12.5, color: "text.secondary" } }}
            />
            <Button type="submit" variant="contained" fullWidth disabled={enrollPending}>
              {t("auth.login.confirmButton")}
            </Button>
          </Stack>
        </>
      )}
    </AuthShell>
  );
}
