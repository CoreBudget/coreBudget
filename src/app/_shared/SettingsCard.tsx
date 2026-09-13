"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTokens } from "@/theme";

export default function SettingsCard({
  title,
  subtitle,
  children,
  sx,
  titleFontSize = 15,
  titleColor,
  subtitleFontSize = 11.5,
  subtitleColor,
  subtitleMb = "18px",
  contentGap = 2.5,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
  titleFontSize?: number;
  titleColor?: string;
  subtitleFontSize?: number;
  subtitleColor?: string;
  subtitleMb?: string;
  contentGap?: string | number;
}) {
  const tokens = useTokens();
  return (
    <Box
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "20px", ...sx }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      <Typography
        sx={{ fontSize: titleFontSize, fontWeight: 700 }}
        style={{ color: titleColor ?? tokens.textBody }}
      >
        {title}
      </Typography>
      <Typography
        sx={{ fontSize: subtitleFontSize, mb: subtitleMb }}
        style={{ color: subtitleColor ?? tokens.textMuted }}
      >
        {subtitle}
      </Typography>
      <Stack sx={{ gap: contentGap }}>{children}</Stack>
    </Box>
  );
}
