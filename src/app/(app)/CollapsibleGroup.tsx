"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTokens } from "@/theme";

export default function CollapsibleGroup({
  label,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
}: {
  label: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  const tokens = useTokens();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;

  function toggle() {
    if (onOpenChange) onOpenChange(!open);
    else setOpenState((o) => !o);
  }

  return (
    <Box sx={{ mt: "4px" }}>
      <Box
        component="button"
        onClick={toggle}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          px: "12px",
          py: "8px",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 500,
        }}
        style={{ color: tokens.textMuted }}
      >
        <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>{label}</Box>
        {open ? (
          <ExpandMoreIcon sx={{ fontSize: 16 }} />
        ) : (
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        )}
      </Box>
      {open && <Box sx={{ px: "4px", pb: "6px" }}>{children}</Box>}
    </Box>
  );
}
