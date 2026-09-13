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
import { updateRetirementGoalAction } from "../actions";

export default function RetirementGoalPanel({
  locale,
  currencyCode,
  currentTotal,
  retirementGoalAmount,
  retirementGoalAge,
}: {
  locale: string | null;
  currencyCode: string;
  currentTotal: number;
  retirementGoalAmount: string;
  retirementGoalAge: string;
}) {
  const t = useTranslations("settings.taxRetirement.goal");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const [goalAmount, setGoalAmount] = useState(retirementGoalAmount);

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => updateRetirementGoalAction({}, formData),
      () => {
        showToast(t("successToast"), "success");
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  const pct = useMemo(() => {
    const goal = Number(goalAmount) || 0;
    return goal > 0 ? Math.min(100, Math.round((currentTotal / goal) * 100)) : 0;
  }, [goalAmount, currentTotal]);

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
            name="retirementGoalAmount"
            label={t("targetSavingsLabel")}
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
          <TextField
            size="small"
            name="retirementGoalAge"
            label={t("targetAgeLabel")}
            defaultValue={retirementGoalAge}
            fullWidth
          />
        </Box>

        <Box>
          <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 12, mb: "6px" }}>
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {t("ofGoalPct", { pct })}
            </Typography>
            <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
              {formatCurrency(currentTotal, locale, currencyCode)} /{" "}
              {formatCurrency(Number(goalAmount) || 0, locale, currencyCode)}
            </Typography>
          </Stack>
          <Box
            sx={{ height: 8, borderRadius: "4px", overflow: "hidden" }}
            style={{ backgroundColor: tokens.border }}
          >
            <Box
              sx={{ height: "100%", width: `${pct}%` }}
              style={{ backgroundColor: tokens.blue }}
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
