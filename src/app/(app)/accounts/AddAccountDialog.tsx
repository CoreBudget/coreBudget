"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Field from "../../_shared/Field";
import { useToast } from "../../_shared/ToastProvider";
import { useServerAction } from "../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { ACCOUNT_TYPE_LABEL_KEYS } from "../accountTypeLabels";
import { createAccountAction } from "./actions";

const CATEGORIES = [
  { value: "cash", labelKey: "accounts.category.cash" },
  { value: "credit", labelKey: "accounts.category.credit" },
] as const;

const TYPE_OPTIONS: Record<(typeof CATEGORIES)[number]["value"], string[]> = {
  cash: ["checking", "savings", "cash", "investment"],
  credit: ["credit", "line_credit"],
};

export default function AddAccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();
  const [category, setCategory] = useState<"cash" | "credit">("cash");
  const [type, setType] = useState(TYPE_OPTIONS.cash[0]);
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();

  function handleCategoryChange(next: "cash" | "credit") {
    setCategory(next);
    setType(TYPE_OPTIONS[next][0]);
  }

  function handleSubmit(formData: FormData) {
    formData.set("category", category);
    formData.set("type", type);
    setError(undefined);
    run(
      () => createAccountAction({}, formData),
      (result) => {
        onClose();
        showToast(t("accounts.addDialog.successToast"), "success");
        if (result.accountId) router.push(`/accounts/${result.accountId}`);
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t("accounts.addDialog.title")}</DialogTitle>
      <Stack component="form" action={handleSubmit} key={open ? "open" : "closed"}>
        <DialogContent>
          <Stack sx={{ gap: 2 }}>
            <Field label={t("accounts.addDialog.categoryLabel")} htmlFor="account-category">
              <TextField
                id="account-category"
                select
                fullWidth
                size="small"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as "cash" | "credit")}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {td(t, c.labelKey)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field label={t("accounts.addDialog.typeLabel")} htmlFor="account-type">
              <TextField
                id="account-type"
                select
                fullWidth
                size="small"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPE_OPTIONS[category].map((value) => (
                  <MenuItem key={value} value={value}>
                    {td(t, ACCOUNT_TYPE_LABEL_KEYS[value])}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field label={t("accounts.addDialog.nameLabel")} htmlFor="account-name">
              <TextField id="account-name" name="name" autoFocus required fullWidth />
            </Field>

            <Field
              label={t("accounts.addDialog.startingBalanceLabel")}
              htmlFor="account-starting-balance"
            >
              <TextField
                id="account-starting-balance"
                name="startingBalance"
                type="number"
                fullWidth
                defaultValue={0}
                slotProps={{ htmlInput: { step: "0.01" } }}
              />
            </Field>

            <Field label={t("accounts.addDialog.websiteLabel")} htmlFor="account-website">
              <TextField
                id="account-website"
                name="website"
                placeholder="e.g., chase.com"
                fullWidth
                size="small"
              />
            </Field>

            {category === "credit" && (
              <Field
                label={t("accounts.addDialog.paymentDueDayLabel")}
                htmlFor="account-payment-due-day"
              >
                <TextField
                  id="account-payment-due-day"
                  name="paymentDueDay"
                  type="number"
                  placeholder="e.g., 15"
                  fullWidth
                  size="small"
                  helperText={t("accounts.addDialog.paymentDueDayHint")}
                  slotProps={{ htmlInput: { min: 1, max: 31, step: 1 } }}
                />
              </Field>
            )}

            {type === "credit" && (
              <Field
                label={t("accounts.addDialog.cardExpirationLabel")}
                htmlFor="account-card-expiration"
              >
                <TextField
                  id="account-card-expiration"
                  name="cardExpiration"
                  placeholder="MM/YYYY"
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { maxLength: 7, inputMode: "numeric" } }}
                />
              </Field>
            )}

            {error && <Alert severity="error">{td(t, error)}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ color: "text.secondary" }}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {t("accounts.addDialog.title")}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
