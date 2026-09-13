"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SectionHeader from "../_shared/SectionHeader";
import { useTokens } from "@/theme";

type Tone = "success" | "info" | "neutral";

export default function HealthCards({
  title,
  subtitle,
  cards,
}: {
  title: string;
  subtitle: string;
  cards: { label: string; value: string; tone: Tone }[];
}) {
  const tokens = useTokens();

  const toneColor: Record<Tone, string> = {
    success: tokens.green,
    info: tokens.blue,
    neutral: tokens.textBody,
  };

  return (
    <Box>
      <SectionHeader title={title} subtitle={subtitle} />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
        {cards.map((c) => (
          <Box
            key={c.label}
            sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "18px" }}
            style={{ backgroundColor: tokens.cardBackground }}
          >
            <Typography
              sx={{
                fontSize: 11.5,
                mb: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
              style={{ color: tokens.textMuted }}
            >
              {c.label}
            </Typography>
            <Typography sx={{ fontSize: 19, fontWeight: 700 }} style={{ color: toneColor[c.tone] }}>
              {c.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
