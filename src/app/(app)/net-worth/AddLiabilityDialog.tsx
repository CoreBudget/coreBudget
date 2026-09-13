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
import { LIABILITY_TYPE_LABEL_KEYS } from "./netWorthTypeLabels";
import { createLiabilityAction } from "./actions";

export default function AddLiabilityDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => createLiabilityAction({}, formData),
      (result) => {
        onClose();
        showToast(t("netWorth.addLiabilityDialog.successToast"), "success");
        if (result.liabilityId) router.push(`/net-worth/liabilities/${result.liabilityId}`);
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t("netWorth.addLiabilityDialog.title")}</DialogTitle>
      <Stack component="form" action={handleSubmit} key={open ? "open" : "closed"}>
        <DialogContent>
          <Stack sx={{ gap: 2 }}>
            <Field label={t("netWorth.addLiabilityDialog.nameLabel")} htmlFor="liability-name">
              <TextField id="liability-name" name="name" autoFocus required fullWidth />
            </Field>

            <Field label={t("netWorth.addLiabilityDialog.typeLabel")} htmlFor="liability-type">
              <TextField
                id="liability-type"
                name="type"
                select
                fullWidth
                size="small"
                defaultValue="personal_loan"
              >
                {Object.entries(LIABILITY_TYPE_LABEL_KEYS).map(([value, key]) => (
                  <MenuItem key={value} value={value}>
                    {td(t, key)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field
              label={t("netWorth.addLiabilityDialog.startingBalanceLabel")}
              htmlFor="liability-starting-balance"
            >
              <TextField
                id="liability-starting-balance"
                name="startingBalance"
                type="number"
                fullWidth
                defaultValue={0}
                slotProps={{ htmlInput: { step: "0.01" } }}
              />
            </Field>

            <Field
              label={t("netWorth.addLiabilityDialog.interestRateLabel")}
              htmlFor="liability-interest-rate"
            >
              <TextField
                id="liability-interest-rate"
                name="interestRate"
                type="number"
                placeholder="e.g., 6.5 or 3.839"
                fullWidth
                size="small"
                slotProps={{ htmlInput: { step: "0.0001" } }}
              />
            </Field>

            <Field
              label={t("netWorth.addLiabilityDialog.minimumPaymentLabel")}
              htmlFor="liability-minimum-payment"
            >
              <TextField
                id="liability-minimum-payment"
                name="minimumPayment"
                type="number"
                fullWidth
                size="small"
                slotProps={{ htmlInput: { step: "0.01" } }}
              />
            </Field>

            <Field
              label={t("netWorth.addLiabilityDialog.paymentDueDayLabel")}
              htmlFor="liability-payment-due-day"
            >
              <TextField
                id="liability-payment-due-day"
                name="paymentDueDay"
                type="number"
                placeholder="e.g., 1"
                fullWidth
                size="small"
                helperText={t("netWorth.addLiabilityDialog.paymentDueDayHint")}
                slotProps={{ htmlInput: { min: 1, max: 31, step: 1 } }}
              />
            </Field>

            <Field
              label={t("netWorth.addLiabilityDialog.loanStartDateLabel")}
              htmlFor="liability-loan-start-date"
            >
              <TextField
                id="liability-loan-start-date"
                name="loanStartDate"
                type="date"
                required
                fullWidth
                size="small"
                helperText={t("netWorth.addLiabilityDialog.loanStartDateHint")}
              />
            </Field>

            {error && <Alert severity="error">{td(t, error)}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ color: "text.secondary" }}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {t("netWorth.addLiabilityDialog.title")}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
