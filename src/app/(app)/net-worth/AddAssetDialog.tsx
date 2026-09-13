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
import { ASSET_TYPE_LABEL_KEYS } from "./netWorthTypeLabels";
import { createAssetAction } from "./actions";

export default function AddAssetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => createAssetAction({}, formData),
      (result) => {
        onClose();
        showToast(t("netWorth.addAssetDialog.successToast"), "success");
        if (result.assetId) router.push(`/net-worth/assets/${result.assetId}`);
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t("netWorth.addAssetDialog.title")}</DialogTitle>
      <Stack component="form" action={handleSubmit} key={open ? "open" : "closed"}>
        <DialogContent>
          <Stack sx={{ gap: 2 }}>
            <Field label={t("netWorth.addAssetDialog.nameLabel")} htmlFor="asset-name">
              <TextField id="asset-name" name="name" autoFocus required fullWidth />
            </Field>

            <Field label={t("netWorth.addAssetDialog.typeLabel")} htmlFor="asset-type">
              <TextField
                id="asset-type"
                name="type"
                select
                fullWidth
                size="small"
                defaultValue="other"
              >
                {Object.entries(ASSET_TYPE_LABEL_KEYS).map(([value, key]) => (
                  <MenuItem key={value} value={value}>
                    {td(t, key)}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field label={t("netWorth.addAssetDialog.valueLabel")} htmlFor="asset-value">
              <TextField
                id="asset-value"
                name="value"
                type="number"
                fullWidth
                defaultValue={0}
                slotProps={{ htmlInput: { step: "0.01" } }}
              />
            </Field>

            <Field
              label={t("netWorth.addAssetDialog.purchaseDateLabel")}
              htmlFor="asset-purchase-date"
            >
              <TextField
                id="asset-purchase-date"
                name="purchaseDate"
                type="date"
                fullWidth
                size="small"
              />
            </Field>

            <Field
              label={t("netWorth.addAssetDialog.descriptionLabel")}
              htmlFor="asset-description"
            >
              <TextField
                id="asset-description"
                name="description"
                fullWidth
                size="small"
                multiline
                minRows={2}
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
            {t("netWorth.addAssetDialog.title")}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
