"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { useTokens } from "@/theme";
import { formatCurrency } from "@/lib/currency";
import type { BudgetCategoryRow } from "./BudgetPanel";

const SWIPE_DISMISS_THRESHOLD = 80;

export default function BudgetMobilePanel({
  category,
  locale,
  currencyCode,
  canEdit,
  readyToAssignTile,
  summaryCard,
  missingCallout,
  renderActivityCard,
  renderTargetCard,
  onCommitAssigned,
  onClose,
}: {
  category: BudgetCategoryRow | null;
  locale: string | null;
  currencyCode: string;
  canEdit: boolean;
  readyToAssignTile: ReactNode;
  summaryCard: ReactNode;
  missingCallout: ReactNode;
  renderActivityCard: (category: BudgetCategoryRow) => ReactNode;
  renderTargetCard: (category: BudgetCategoryRow) => ReactNode;
  onCommitAssigned: (categoryId: string, rawValue: string, previous: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("budget");
  const tokens = useTokens();
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setSwiping(true);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx > 0) setSwipeX(dx);
  }
  function handleTouchEnd() {
    if (swipeX > SWIPE_DISMISS_THRESHOLD) onClose();
    else {
      setSwipeX(0);
      setSwiping(false);
    }
  }

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 30 }}>
      <Box
        onClick={onClose}
        sx={{ position: "absolute", inset: 0 }}
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      />
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(360px, 92vw)",
          overflowY: "auto",
          p: "16px",
          transition: swiping ? "none" : "transform 0.2s ease-out",
        }}
        style={{
          backgroundColor: tokens.pageBackground,
          borderLeft: `1px solid ${tokens.border}`,
          transform: `translateX(${swipeX}px)`,
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: "14px" }}
        >
          <Typography sx={{ fontSize: 15, fontWeight: 700 }} style={{ color: tokens.textPrimary }}>
            {category ? category.name : t("summaryTitle")}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label={t("closePanel")}>
            <CloseIcon sx={{ fontSize: 18 }} style={{ color: tokens.textFaint }} />
          </IconButton>
        </Stack>

        <Stack sx={{ gap: "14px" }}>
          {readyToAssignTile}
          {summaryCard}

          {category && (
            <Box
              sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "12px 14px" }}
              style={{ backgroundColor: tokens.cardBackground }}
            >
              <Typography sx={{ fontSize: 12, mb: "8px" }} style={{ color: tokens.textFaint }}>
                {t("columnAssigned")}
              </Typography>
              <TextField
                key={category.assigned}
                size="small"
                fullWidth
                defaultValue={formatCurrency(category.assigned, locale, currencyCode)}
                disabled={!canEdit}
                aria-label={t("assignedAmountLabel", { name: category.name })}
                onBlur={(e) => onCommitAssigned(category.id, e.target.value, category.assigned)}
              />
            </Box>
          )}

          {category && (
            <Box
              sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "12px 16px" }}
              style={{ backgroundColor: tokens.cardBackground }}
            >
              <Typography
                sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
                style={{ color: tokens.textBody }}
              >
                {t("activityTitle")}
              </Typography>
              {renderActivityCard(category)}
            </Box>
          )}

          {category && renderTargetCard(category)}

          {missingCallout}
        </Stack>
      </Box>
    </Box>
  );
}
