import type { ComponentType } from "react";
import Box from "@mui/material/Box";
import type { SvgIconProps } from "@mui/material/SvgIcon";

export default function NavIconLabel({
  icon: Icon,
  label,
}: {
  icon: ComponentType<SvgIconProps>;
  label: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <Icon sx={{ fontSize: 17 }} />
      {label}
    </Box>
  );
}
