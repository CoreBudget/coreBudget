"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslations } from "next-intl";
import AddIcon from "@mui/icons-material/Add";
import Field from "../../_shared/Field";
import AdminButton from "../_shared/AdminButton";
import { useServerAction } from "../../_shared/useServerAction";
import { createHouseholdAction, type FormResult } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

export default function CreateHouseholdDialog({
  users,
}: {
  users: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const router = useRouter();
  const t = useTranslations();

  function submit(formData: FormData) {
    setError(undefined);
    run(
      (): Promise<FormResult> => createHouseholdAction({}, formData),
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
        {t("admin.households.createHousehold")}
      </AdminButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("admin.households.createHouseholdDialog.title")}
        </DialogTitle>
        <Stack component="form" action={submit}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("admin.households.createHouseholdDialog.nameLabel")} htmlFor="name">
                <TextField id="name" name="name" autoFocus required fullWidth />
              </Field>
              <Field
                label={t("admin.households.createHouseholdDialog.ownerLabel")}
                htmlFor="ownerUserId"
              >
                <TextField
                  id="ownerUserId"
                  name="ownerUserId"
                  select
                  required
                  fullWidth
                  defaultValue=""
                >
                  <MenuItem value="" disabled>
                    {t("admin.households.createHouseholdDialog.selectUser")}
                  </MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Field>
              {error && <Alert severity="error">{td(t, error)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {t("admin.households.createHouseholdDialog.submit")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </>
  );
}
