import type { ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function SectionHeader({
  title,
  subtitle,
  action,
  headingLevel = "h1",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  headingLevel?: "h1" | "h2";
}) {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: "20px" }}
    >
      <Stack sx={{ gap: "4px" }}>
        <Typography
          component={headingLevel}
          sx={{ fontSize: 20, fontWeight: 700, color: "text.primary", m: 0 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", maxWidth: 640 }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
      {action}
    </Stack>
  );
}
