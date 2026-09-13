"use client";

import { useColorScheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import IconButton from "@mui/material/IconButton";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { updateThemeModeAction } from "./themeActions";

export default function ThemeToggle() {
  const t = useTranslations();
  const { mode, setMode } = useColorScheme();
  const resolvedMode = mode === "system" ? "dark" : (mode ?? "dark");

  function toggle() {
    const next = resolvedMode === "dark" ? "light" : "dark";
    setMode(next);
    void updateThemeModeAction(next);
  }

  return (
    <IconButton
      onClick={toggle}
      size="small"
      aria-label={t("common.themeToggle.ariaLabel")}
      title={
        resolvedMode === "dark"
          ? t("common.themeToggle.switchToLight")
          : t("common.themeToggle.switchToDark")
      }
      sx={{ color: "text.secondary" }}
    >
      {resolvedMode === "dark" ? (
        <LightModeIcon fontSize="small" />
      ) : (
        <DarkModeIcon fontSize="small" />
      )}
    </IconButton>
  );
}
