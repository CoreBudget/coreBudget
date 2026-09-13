"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SectionHeader from "../../../../admin/_shared/SectionHeader";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { updateProfileAction } from "../actions";

export default function ProfilePanel({ name, email }: { name: string; email: string }) {
  const t = useTranslations("settings.profile");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => updateProfileAction({}, formData),
      () => {
        showToast(t("successToast"), "success");
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />
      <Stack
        component="form"
        action={handleSubmit}
        sx={{
          gap: 2,
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          p: "20px",
          width: "100%",
        }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Stack direction="row" sx={{ alignItems: "center", gap: "14px" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              fontWeight: 700,
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Box>
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {email}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField
            name="name"
            label={t("nameLabel")}
            defaultValue={name}
            size="small"
            fullWidth
          />
          <TextField
            name="email"
            type="email"
            label={t("emailLabel")}
            defaultValue={email}
            size="small"
            fullWidth
          />
        </Box>

        {error && <Alert severity="error">{td(tRoot, error)}</Alert>}

        <Box>
          <AdminButton type="submit" variant="contained" disabled={pending}>
            {t("saveButton")}
          </AdminButton>
        </Box>
      </Stack>
    </Box>
  );
}
