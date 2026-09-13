"use client";

import Button from "@mui/material/Button";
import type { ButtonProps } from "@mui/material/Button";
import { useTokens } from "@/theme";

export default function AdminButton({ danger, sx, ...props }: ButtonProps & { danger?: boolean }) {
  const tokens = useTokens();
  const variant = props.variant ?? (danger ? "text" : "outlined");
  return (
    <Button
      {...props}
      variant={variant}
      size="small"
      sx={{
        fontSize: 12.5,
        fontWeight: 500,
        px: "13px",
        py: "8px",
        borderRadius: "7px",
        whiteSpace: "nowrap",
        ...(danger && {
          color: tokens.red,
          bgcolor: `${tokens.red}26`,
          border: "none",
          "&:hover": { bgcolor: `${tokens.red}40` },
        }),
        ...sx,
      }}
    />
  );
}
