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
import { grantHouseholdAccessAction, type FormResult } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

export default function GrantAccessDialog({
  householdId,
  candidateUsers,
}: {
  householdId: string;
  candidateUsers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const router = useRouter();
  const t = useTranslations();

  function submit(formData: FormData) {
    setError(undefined);
    run(
      (): Promise<FormResult> => grantHouseholdAccessAction({}, formData),
      () => {
        setOpen(false);
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <>
      <AdminButton startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={() => setOpen(true)}>
        {t("admin.households.grantAccess")}
      </AdminButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("admin.households.grantAccessDialog.title")}
        </DialogTitle>
        <Stack component="form" action={submit}>
          <input type="hidden" name="householdId" value={householdId} />
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("admin.households.grantAccessDialog.userLabel")} htmlFor="userId">
                <TextField id="userId" name="userId" select required fullWidth defaultValue="">
                  <MenuItem value="" disabled>
                    {t("admin.households.createHouseholdDialog.selectUser")}
                  </MenuItem>
                  {candidateUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Field>
              <Field label={t("admin.households.grantAccessDialog.roleLabel")} htmlFor="role">
                <TextField id="role" name="role" select required fullWidth defaultValue="member">
                  <MenuItem value="owner">{t("admin.households.roles.owner")}</MenuItem>
                  <MenuItem value="member">{t("admin.households.roles.member")}</MenuItem>
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
              {t("admin.households.grantAccessDialog.submit")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </>
  );
}
