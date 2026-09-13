"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTokens } from "@/theme";

export default function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  const tokens = useTokens();
  return (
    <Box sx={{ p: 5 }}>
      <Typography
        sx={{ fontSize: 22, fontWeight: 700, mb: "8px" }}
        style={{ color: tokens.textBody }}
      >
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13.5, maxWidth: 520 }} style={{ color: tokens.textMuted }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
