"use client";

import { useMemo, useState } from "react";
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
import { formatCurrency } from "@/lib/currency";
import { updateWithholdingAction } from "../actions";

export default function WithholdingPanel({
  locale,
  currencyCode,
  ytdWithheldAmount,
  estimatedTaxLiability,
}: {
  locale: string | null;
  currencyCode: string;
  ytdWithheldAmount: string;
  estimatedTaxLiability: string;
}) {
  const t = useTranslations("settings.taxRetirement.withholding");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const [withheld, setWithheld] = useState(ytdWithheldAmount);
  const [liability, setLiability] = useState(estimatedTaxLiability);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => updateWithholdingAction({}, formData),
      () => {
        showToast(t("successToast"), "success");
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  const pct = useMemo(() => {
    const w = Number(withheld) || 0;
    const l = Number(liability) || 0;
    return l > 0 ? Math.min(100, Math.round((w / l) * 100)) : 0;
  }, [withheld, liability]);

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
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField
            size="small"
            name="ytdWithheldAmount"
            label={t("ytdWithheldLabel")}
            value={withheld}
            onChange={(e) => setWithheld(e.target.value)}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
          <TextField
            size="small"
            name="estimatedTaxLiability"
            label={t("estimatedLiabilityLabel")}
            value={liability}
            onChange={(e) => setLiability(e.target.value)}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
        </Box>

        <Box>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", fontSize: 12, mb: "6px" }}
            style={{ color: tokens.textFaint }}
          >
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("withheldPct", { pct })}
            </Typography>
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {formatCurrency(Number(withheld) || 0, locale, currencyCode)} /{" "}
              {formatCurrency(Number(liability) || 0, locale, currencyCode)}
            </Typography>
          </Stack>
          <Box
            sx={{ height: 8, borderRadius: "4px", overflow: "hidden" }}
            style={{ backgroundColor: tokens.border }}
          >
            <Box
              sx={{ height: "100%", width: `${pct}%` }}
              style={{ backgroundColor: pct < 80 ? tokens.amber : tokens.green }}
            />
          </Box>
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
