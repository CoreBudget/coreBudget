"use client";

import type { CSSProperties, ReactNode } from "react";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

export default function ClickableText({
  onClick,
  disabled,
  children,
  sx,
  style,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  sx?: SxProps<Theme>;
  style?: CSSProperties;
}) {
  return (
    <Typography
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        border: "none",
        background: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        textAlign: "inherit",
        "&:disabled": { cursor: "default", opacity: 0.6 },
        ...sx,
      }}
      style={style}
    >
      {children}
    </Typography>
  );
}
