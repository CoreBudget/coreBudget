"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTokens } from "@/theme";

export default function ReportHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle: string;
  rightSlot?: ReactNode;
}) {
  const tokens = useTokens();
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: "16px", gap: 1 }}
    >
      <Box>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }} style={{ color: tokens.textBody }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12.5, mt: "2px" }} style={{ color: tokens.textFaint }}>
          {subtitle}
        </Typography>
      </Box>
      {rightSlot}
    </Stack>
  );
}
