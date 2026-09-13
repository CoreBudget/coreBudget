"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import MapIcon from "@mui/icons-material/Map";
import TourIcon from "@mui/icons-material/Tour";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { useTourContext } from "./TourProvider";

export default function HelpTourButton() {
  const tokens = useTokens();
  const t = useTranslations();
  const { replayWelcomeTour, replayPageTour, hasPageTour } = useTourContext();
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={() => setOpen((o) => !o)}
          size="small"
          aria-label={t("tour.helpButtonLabel")}
          title={t("tour.helpButtonLabel")}
        >
          <HelpOutlineIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {open && (
          <Box
            sx={{
              position: "absolute",
              top: 38,
              right: 0,
              width: 210,
              borderRadius: "10px",
              border: `1px solid ${tokens.borderStrong}`,
              boxShadow: tokens.menuShadow,
              p: "6px",
              zIndex: 30,
            }}
            style={{ backgroundColor: tokens.menuBackground }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => {
                setOpen(false);
                replayWelcomeTour();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: 13,
                border: "none",
                background: "none",
                margin: 0,
                font: "inherit",
                cursor: "pointer",
              }}
              style={{ color: tokens.textSecondary }}
            >
              <MapIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
              {t("tour.replayWelcome")}
            </Box>

            <Box
              component="button"
              type="button"
              disabled={!hasPageTour}
              onClick={() => {
                setOpen(false);
                replayPageTour();
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: 13,
                border: "none",
                background: "none",
                margin: 0,
                font: "inherit",
                cursor: hasPageTour ? "pointer" : "not-allowed",
                "&:disabled": { opacity: 0.5 },
              }}
              style={{ color: tokens.textSecondary }}
            >
              <TourIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
              {t("tour.replayPage")}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
