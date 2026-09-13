"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { recordClientErrorAction } from "./errorActions";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const pathname = usePathname();

  useEffect(() => {
    recordClientErrorAction(error.message, error.stack, pathname);
  }, [error, pathname]);

  return (
    <Box sx={{ p: 5, maxWidth: 520 }}>
      <Typography
        sx={{ fontSize: 22, fontWeight: 700, mb: "8px" }}
        style={{ color: tokens.textBody }}
      >
        {t("common.errorPage.title")}
      </Typography>
      <Typography sx={{ fontSize: 13.5, mb: "20px" }} style={{ color: tokens.textMuted }}>
        {t("common.errorPage.subtitle")}
      </Typography>
      <Box sx={{ display: "flex", gap: "10px" }}>
        <Button variant="contained" onClick={reset}>
          {t("common.errorPage.tryAgain")}
        </Button>
        <Button component={Link} href="/dashboard" variant="outlined">
          {t("common.errorPage.goToDashboard")}
        </Button>
      </Box>
    </Box>
  );
}
