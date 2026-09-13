import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export default function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <>
      <Typography
        component="h1"
        sx={{ fontSize: 20, fontWeight: 700, color: "text.primary", mb: "6px" }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: "24px", lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
      )}
    </>
  );
}
