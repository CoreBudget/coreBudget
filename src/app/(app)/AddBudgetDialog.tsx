"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import Field from "../_shared/Field";
import { useServerAction } from "../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { createBudgetAction } from "./actions";

export default function AddBudgetDialog({
  open,
  householdId,
  onClose,
}: {
  open: boolean;
  householdId: string;
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState("");
  const { pending, run } = useServerAction();
  const [error, setError] = useState<string>();

  function handleClose() {
    setName("");
    setError(undefined);
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    run(
      () => createBudgetAction(householdId, name),
      () => {
        setName("");
        onClose();
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t("appShell.budgetSwitcher.addBudgetDialog.title")}
      </DialogTitle>
      <Stack component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack sx={{ gap: 2 }}>
            <Field
              label={t("appShell.budgetSwitcher.addBudgetDialog.nameLabel")}
              htmlFor="budget-name"
            >
              <TextField
                id="budget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                fullWidth
                required
              />
            </Field>
            {error && (
              <Typography sx={{ fontSize: 12.5, color: "error.main" }}>{td(t, error)}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ color: "text.secondary" }}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={pending || !name.trim()}>
            {t("appShell.budgetSwitcher.addBudgetDialog.submit")}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
