"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import AddIcon from "@mui/icons-material/Add";
import Field from "../../_shared/Field";
import AdminButton from "../_shared/AdminButton";
import { useServerAction } from "../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { createPayeeAction } from "./actions";

function translatePayeeError(t: ReturnType<typeof useTranslations>, error: string): string {
  try {
    const parsed = JSON.parse(error) as { key: string; params?: Record<string, string> };
    return td(t, parsed.key, parsed.params);
  } catch {
    return td(t, error);
  }
}

export default function CreatePayeeDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const router = useRouter();
  const t = useTranslations();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => createPayeeAction({}, formData),
      () => {
        setOpen(false);
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <>
      <AdminButton
        variant="contained"
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        onClick={() => setOpen(true)}
      >
        {t("admin.payees.createPayee")}
      </AdminButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("admin.payees.createPayeeDialog.title")}
        </DialogTitle>
        <Stack component="form" action={handleSubmit} key={open ? "open" : "closed"}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("admin.payees.createPayeeDialog.nameLabel")} htmlFor="payee-name">
                <TextField id="payee-name" name="name" autoFocus required fullWidth />
              </Field>
              <FormControlLabel
                control={<Checkbox name="includeInList" defaultChecked />}
                label={t("admin.payees.createPayeeDialog.showInPickerLists")}
              />
              <FormControlLabel
                control={<Checkbox name="enableAutoCategory" defaultChecked />}
                label={t("admin.payees.createPayeeDialog.enableAutoCategory")}
              />
              {error && <Alert severity="error">{translatePayeeError(t, error)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.close")}
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {t("admin.payees.createPayeeDialog.submit")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </>
  );
}
