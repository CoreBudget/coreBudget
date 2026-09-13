"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useTokens } from "@/theme";

export default function ReportCard({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: Record<string, unknown>;
}) {
  const tokens = useTokens();
  return (
    <Box
      sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "16px", ...sx }}
      style={{ backgroundColor: tokens.cardBackground }}
    >
      {children}
    </Box>
  );
}
