"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useServerAction } from "../_shared/useServerAction";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import AuthHeading from "../_shared/AuthHeading";
import Field from "../_shared/Field";
import {
  createHouseholdStep,
  createBudgetStep,
  createAccountStep,
  inviteMemberStep,
  finishSetup,
} from "./actions";
import { initialSetupState } from "./state";
import { td } from "@/lib/i18n/translateDynamicKey";

function translateSetupError(t: ReturnType<typeof useTranslations>, error: string): string {
  try {
    const parsed = JSON.parse(error) as { key: string; params?: Record<string, string> };
    return td(t, parsed.key, parsed.params);
  } catch {
    return td(t, error);
  }
}

const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "investment",
  "credit",
  "line_credit",
] as const;

export function HouseholdForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(createHouseholdStep, initialSetupState);
  return (
    <>
      <AuthHeading title={t("setup.household.title")} subtitle={t("setup.household.subtitle")} />
      <Stack component="form" action={formAction} sx={{ gap: 2 }}>
        <Field label={t("setup.household.nameLabel")} htmlFor="name">
          <TextField
            id="name"
            name="name"
            placeholder={t("setup.household.namePlaceholder")}
            autoFocus
            required
            fullWidth
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

export function BudgetForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(createBudgetStep, initialSetupState);
  return (
    <>
      <AuthHeading title={t("setup.budget.title")} subtitle={t("setup.budget.subtitle")} />
      <Stack component="form" action={formAction} sx={{ gap: 2 }}>
        <Field label={t("setup.budget.nameLabel")} htmlFor="name">
          <TextField
            id="name"
            name="name"
            placeholder={t("setup.budget.namePlaceholder")}
            autoFocus
            required
            fullWidth
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

export function AccountForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(createAccountStep, initialSetupState);
  return (
    <>
      <AuthHeading title={t("setup.account.title")} subtitle={t("setup.account.subtitle")} />
      <Stack component="form" action={formAction} sx={{ gap: 2 }}>
        <Field label={t("setup.account.nameLabel")} htmlFor="name">
          <TextField
            id="name"
            name="name"
            placeholder={t("setup.account.namePlaceholder")}
            autoFocus
            required
            fullWidth
          />
        </Field>
        <Field label={t("setup.account.typeLabel")} htmlFor="type">
          <TextField id="type" name="type" select required fullWidth defaultValue="checking">
            {ACCOUNT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type.replace("_", " ")}
              </MenuItem>
            ))}
          </TextField>
        </Field>
        <Field label={t("setup.account.balanceLabel")} htmlFor="startingBalance">
          <TextField
            id="startingBalance"
            name="startingBalance"
            type="number"
            placeholder={t("setup.account.balancePlaceholder")}
            fullWidth
            defaultValue={0}
            slotProps={{ htmlInput: { step: "0.01" } }}
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

export function InviteForm() {
  const t = useTranslations();
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();

  return (
    <>
      <AuthHeading title={t("setup.invite.title")} subtitle={t("setup.invite.subtitle")} />
      <Stack sx={{ gap: 2 }}>
        {invited.length > 0 && (
          <Alert severity="success">
            {t("setup.invite.invitedList", { list: invited.join(", ") })}
          </Alert>
        )}

        <Stack
          component="form"
          action={(formData: FormData) => {
            setError(undefined);
            const email = formData.get("email");
            run(
              () => inviteMemberStep(initialSetupState, formData),
              () => {
                if (typeof email === "string") setInvited((prev) => [...prev, email]);
              },
              (err) => setError(err),
            );
          }}
          sx={{ gap: 2 }}
        >
          <Field label={t("setup.invite.nameLabel")} htmlFor="name">
            <TextField id="name" name="name" required fullWidth />
          </Field>
          <Field label={t("setup.invite.emailLabel")} htmlFor="email">
            <TextField
              id="email"
              name="email"
              type="email"
              placeholder={t("setup.invite.emailPlaceholder")}
              required
              fullWidth
            />
          </Field>
          {error && <Alert severity="warning">{translateSetupError(t, error)}</Alert>}
          <Stack direction="row" sx={{ justifyContent: "flex-start" }}>
            <Button type="submit" variant="outlined" disabled={pending}>
              {t("setup.invite.addButton")}
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 1 }}>
          <Button
            variant="contained"
            onClick={() => {
              void finishSetup();
            }}
          >
            {t("setup.shared.continueButton")}
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
