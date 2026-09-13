"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import SectionHeader from "../../../../admin/_shared/SectionHeader";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { DATE_FORMAT_OPTIONS } from "@/lib/date";
import { updateLocalizationAction } from "../actions";

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  en: "settings.localization.languages.en",
};

export default function LocalizationPanel({
  locale,
  timezone,
  dateFormatPreference,
  timezones,
  locales,
}: {
  locale: string;
  timezone: string;
  dateFormatPreference: string;
  timezones: string[];
  locales: string[];
}) {
  const t = useTranslations("settings.localization");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);

  function handleSubmit(formData: FormData) {
    formData.set("timezone", selectedTimezone);
    setError(undefined);
    run(
      () => updateLocalizationAction({}, formData),
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Autocomplete
            size="small"
            options={timezones}
            value={selectedTimezone}
            onChange={(_e, value) => setSelectedTimezone(value ?? "UTC")}
            disableClearable
            renderInput={(params) => <TextField {...params} label={t("timezoneLabel")} />}
          />

          <TextField
            select
            size="small"
            name="dateFormatPreference"
            label={t("dateFormatLabel")}
            defaultValue={dateFormatPreference}
            fullWidth
          >
            {DATE_FORMAT_OPTIONS.map((format) => (
              <MenuItem key={format} value={format}>
                {format}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            name="locale"
            label={t("languageLabel")}
            defaultValue={locale}
            fullWidth
          >
            {locales.map((code) => (
              <MenuItem key={code} value={code}>
                {td(tRoot, LANGUAGE_LABEL_KEYS[code] ?? "settings.localization.languages.en")}
              </MenuItem>
            ))}
          </TextField>
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
