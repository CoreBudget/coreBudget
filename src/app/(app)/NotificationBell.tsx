"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { useIsMobile } from "./useIsMobile";
import {
  getNotificationsAction,
  markNotificationReadAction,
  archiveNotificationAction,
  archiveAllNotificationsAction,
  type NotificationRow,
} from "./notificationsActions";

export default function NotificationBell() {
  const tokens = useTokens();
  const t = useTranslations();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    getNotificationsAction().then((result) => setItems(result.items));
  }, []);

  const unreadCount = items.filter((i) => !i.readAt).length;

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, readAt: new Date().toISOString() } : i)),
    );
    startTransition(() => markNotificationReadAction(id));
  }

  function dismiss(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => archiveNotificationAction(id));
  }

  function clearAll() {
    const ids = items.map((i) => i.id);
    setItems([]);
    startTransition(() => archiveAllNotificationsAction(ids));
  }

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={() => setOpen((o) => !o)}
          size="small"
          aria-label={t("appShell.notificationBell.ariaLabel")}
          sx={{ color: "text.secondary" }}
        >
          <Badge
            badgeContent={unreadCount}
            max={99}
            color="error"
            slotProps={{ badge: { style: { fontSize: 9.5, height: 15, minWidth: 15 } } }}
          >
            <NotificationsNoneIcon fontSize="small" />
          </Badge>
        </IconButton>

        {open && (
          <Box
            sx={
              isMobile
                ? {
                    position: "fixed",
                    left: "14px",
                    right: "14px",
                    bottom: "76px",
                    maxHeight: "70vh",
                    overflowY: "auto",
                    borderRadius: "10px",
                    border: `1px solid ${tokens.borderStrong}`,
                    boxShadow: tokens.menuShadow,
                    p: "10px",
                    zIndex: 30,
                  }
                : {
                    position: "absolute",
                    top: 44,
                    right: 0,
                    width: 320,
                    maxHeight: "70vh",
                    overflowY: "auto",
                    borderRadius: "10px",
                    border: `1px solid ${tokens.borderStrong}`,
                    boxShadow: tokens.menuShadow,
                    p: "10px",
                    zIndex: 30,
                  }
            }
            style={{ backgroundColor: tokens.menuBackground }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: "6px",
              }}
            >
              <Typography
                sx={{ fontSize: 12, textTransform: "uppercase", fontWeight: 500 }}
                style={{ color: tokens.textMuted }}
              >
                {t("appShell.notificationBell.heading")}
              </Typography>
              {items.length > 0 && (
                <Box
                  component="button"
                  onClick={clearAll}
                  sx={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11.5,
                    p: 0,
                  }}
                  style={{ color: tokens.blue }}
                >
                  {t("notifications.bell.clearAll")}
                </Box>
              )}
            </Box>

            {items.length === 0 ? (
              <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textDisabled }}>
                {t("notifications.bell.empty")}
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {items.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      p: "8px",
                      borderRadius: "8px",
                      opacity: item.readAt ? 0.55 : 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                        {item.title}
                      </Typography>
                      {item.body && (
                        <Typography
                          sx={{ fontSize: 11, mt: "2px", whiteSpace: "pre-line" }}
                          style={{ color: tokens.textFaint }}
                        >
                          {item.body}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: "2px", flex: "none" }}>
                      {!item.readAt && (
                        <IconButton
                          size="small"
                          aria-label={t("notifications.bell.markReadAriaLabel")}
                          onClick={() => markRead(item.id)}
                        >
                          <CheckIcon sx={{ fontSize: 15 }} style={{ color: tokens.green }} />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        aria-label={t("notifications.bell.dismissAriaLabel")}
                        onClick={() => dismiss(item.id)}
                      >
                        <CloseIcon sx={{ fontSize: 15 }} style={{ color: tokens.red }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Box
              component={Link}
              href="/notifications"
              onClick={() => setOpen(false)}
              sx={{
                display: "block",
                textAlign: "center",
                fontSize: 11.5,
                mt: "8px",
                pt: "8px",
                borderTop: `1px solid ${tokens.divider}`,
                textDecoration: "none",
              }}
              style={{ color: tokens.blue }}
            >
              {t("notifications.bell.viewAll")}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
