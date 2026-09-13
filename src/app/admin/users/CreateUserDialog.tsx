"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import AddIcon from "@mui/icons-material/Add";
import Field from "../../_shared/Field";
import AdminButton from "../_shared/AdminButton";
import { td } from "@/lib/i18n/translateDynamicKey";
import { createUserAction, type CreateUserResult } from "./actions";

const initialState: CreateUserResult = {};

function translateUserMessage(t: ReturnType<typeof useTranslations>, message: string): string {
  try {
    const parsed = JSON.parse(message) as { key: string; params?: Record<string, string> };
    return td(t, parsed.key, parsed.params);
  } catch {
    return td(t, message);
  }
}

export default function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createUserAction, initialState);
  const router = useRouter();
  const t = useTranslations();

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [state.message, router]);

  return (
    <>
      <AdminButton
        variant="contained"
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        onClick={() => setOpen(true)}
      >
        {t("admin.users.createUser")}
      </AdminButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("admin.users.createUserDialog.title")}
        </DialogTitle>
        <Stack component="form" action={formAction}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("admin.users.createUserDialog.nameLabel")} htmlFor="name">
                <TextField id="name" name="name" autoFocus required fullWidth />
              </Field>
              <Field label={t("admin.users.createUserDialog.emailLabel")} htmlFor="email">
                <TextField id="email" name="email" type="email" required fullWidth />
              </Field>
              {state.error && (
                <Alert severity="error">{translateUserMessage(t, state.error)}</Alert>
              )}
              {state.message && (
                <Alert severity="success">{translateUserMessage(t, state.message)}</Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.close")}
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {t("admin.users.createUserDialog.submit")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </>
  );
}
