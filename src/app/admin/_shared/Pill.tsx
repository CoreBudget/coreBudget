import Box from "@mui/material/Box";

export default function Pill({ label, color }: { label: string; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        fontWeight: 600,
        px: "9px",
        py: "3px",
        borderRadius: "20px",
        display: "inline-block",
        whiteSpace: "nowrap",
        flexShrink: 0,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        bgcolor: `${color}26`,
        color,
      }}
    >
      {label}
    </Box>
  );
}
