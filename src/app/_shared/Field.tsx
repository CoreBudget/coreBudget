import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Typography
        component="label"
        htmlFor={htmlFor}
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: "text.secondary",
          mb: "6px",
          display: "block",
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}
