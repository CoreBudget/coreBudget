"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import AdminButton from "../_shared/AdminButton";
import { useTokens } from "@/theme";
import { featureLabel, levelLabel } from "./featureLabels";
import { savePermissionsAction } from "./actions";

const LEVELS = ["no_access", "read_only", "edit"] as const;

export default function PermissionMatrixDialog({
  budgetId,
  budgetName,
  userId,
  userName,
  features,
  initialPermissions,
}: {
  budgetId: string;
  budgetName: string;
  userId: string;
  userName: string;
  features: string[];
  initialPermissions: Record<string, string>;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialPermissions);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const LEVEL_COLOR: Record<string, string> = {
    no_access: tokens.red,
    read_only: tokens.blue,
    edit: tokens.green,
  };

  function openDialog() {
    setDraft(initialPermissions);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      await savePermissionsAction(budgetId, userId, draft);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <AdminButton onClick={openDialog}>{t("admin.households.managePermissions")}</AdminButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, pb: 0 }}>{userName}</DialogTitle>
        <Typography sx={{ px: 3, fontSize: 12.5, color: "text.secondary", mb: 1 }}>
          {budgetName}
        </Typography>
        <DialogContent>
          <Stack sx={{ gap: 0 }}>
            {features.map((f) => (
              <Stack
                key={f}
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: "8px",
                  borderTop: `1px solid ${tokens.divider}`,
                }}
              >
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                  {featureLabel(t, f)}
                </Typography>
                <Stack direction="row" sx={{ gap: "6px" }}>
                  {LEVELS.map((level) => {
                    const active = draft[f] === level;
                    return (
                      <Box
                        key={level}
                        component="button"
                        type="button"
                        aria-pressed={active}
                        onClick={() => setDraft((prev) => ({ ...prev, [f]: level }))}
                        sx={{
                          fontSize: 11,
                          border: "none",
                          margin: 0,
                          font: "inherit",
                          px: "10px",
                          py: "5px",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                        style={{
                          backgroundColor: active ? LEVEL_COLOR[level] : tokens.hoverBackground,
                          color: active ? tokens.blueContrast : tokens.textMuted,
                        }}
                      >
                        {levelLabel(t, level)}
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: "text.secondary" }}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" disabled={pending} onClick={save}>
            {t("admin.households.savePermissions")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
