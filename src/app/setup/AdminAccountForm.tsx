"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AuthHeading from "../_shared/AuthHeading";
import Field from "../_shared/Field";
import { createAdminAccount } from "./actions";
import { initialSetupState } from "./state";
import { td } from "@/lib/i18n/translateDynamicKey";

export default function AdminAccountForm({
  qrDataUrl,
  secret,
}: {
  qrDataUrl: string;
  secret: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(createAdminAccount, initialSetupState);

  return (
    <>
      <AuthHeading
        title={t("setup.adminAccount.title")}
        subtitle={t("setup.adminAccount.subtitle")}
      />
      <Stack component="form" action={formAction} sx={{ gap: 2 }}>
        <input type="hidden" name="secret" value={secret} />

        <Field label={t("setup.adminAccount.nameLabel")} htmlFor="name">
          <TextField
            id="name"
            name="name"
            placeholder={t("setup.adminAccount.namePlaceholder")}
            autoFocus
            required
            fullWidth
          />
        </Field>
        <Field label={t("setup.adminAccount.emailLabel")} htmlFor="email">
          <TextField
            id="email"
            name="email"
            type="email"
            placeholder={t("setup.adminAccount.emailPlaceholder")}
            autoComplete="email"
            required
            fullWidth
          />
        </Field>
        <Field label={t("setup.adminAccount.passwordLabel")} htmlFor="password">
          <TextField
            id="password"
            name="password"
            type="password"
            placeholder={t("setup.adminAccount.passwordPlaceholder")}
            autoComplete="new-password"
            required
            fullWidth
          />
        </Field>
        <Field label={t("setup.adminAccount.confirmPasswordLabel")} htmlFor="confirmPassword">
          <TextField
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder={t("setup.adminAccount.confirmPasswordPlaceholder")}
            autoComplete="new-password"
            required
            fullWidth
          />
        </Field>

        <Stack sx={{ gap: 1, alignItems: "center", textAlign: "center", my: 1 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {t("setup.adminAccount.totpInstructions")}
          </Typography>
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URI, not an optimizable remote image */}
          <img
            src={qrDataUrl}
            alt={t("setup.adminAccount.qrAlt")}
            width={160}
            height={160}
            style={{ borderRadius: 6 }}
          />
          <Typography sx={{ fontSize: 11.5, color: "text.disabled", wordBreak: "break-all" }}>
            {t("setup.adminAccount.manualKeyEntry", { secret })}
          </Typography>
        </Stack>

        <Field label={t("setup.adminAccount.codeLabel")} htmlFor="code">
          <TextField
            id="code"
            name="code"
            placeholder={t("setup.adminAccount.codePlaceholder")}
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

        <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 1 }}>
          <Button type="submit" variant="contained" disabled={pending}>
            {t("setup.shared.continueButton")}
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
