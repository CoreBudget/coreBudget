import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BrandMark from "./BrandMark";

export default function AuthShell({
  maxWidth = 420,
  aboveCard,
  children,
}: {
  maxWidth?: number;
  aboveCard?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: "40px 20px",
      }}
    >
      <Box sx={{ width: "100%", maxWidth }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "center", gap: 1, mb: "28px" }}
        >
          <BrandMark size={24} />
          <Typography sx={{ fontSize: 19, fontWeight: 700, color: "text.primary" }}>
            CoreBudget
          </Typography>
        </Stack>

        {aboveCard}

        <Card>
          <CardContent sx={{ p: "32px", "&:last-child": { pb: "32px" } }}>{children}</CardContent>
        </Card>
      </Box>
    </Box>
  );
}
