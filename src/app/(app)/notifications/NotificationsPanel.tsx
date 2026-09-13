"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import SectionHeader from "../../admin/_shared/SectionHeader";
import {
  getNotificationHistoryAction,
  markNotificationReadAction,
  deleteNotificationAction,
  type NotificationRow,
} from "../notificationsActions";

export default function NotificationsPanel({
  initialItems,
  initialCursor,
}: {
  initialItems: NotificationRow[];
  initialCursor: string | null;
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      if (!cursor) return;
      const result = await getNotificationHistoryAction(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  function markRead(id: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, readAt: new Date().toISOString() } : i)),
    );
    startTransition(() => markNotificationReadAction(id));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(() => deleteNotificationAction(id));
  }

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <SectionHeader
        title={t("notifications.page.title")}
        subtitle={t("notifications.page.subtitle")}
      />

      {items.length === 0 ? (
        <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }}>
          {t("notifications.page.empty")}
        </Typography>
      ) : (
        <Stack sx={{ gap: "8px" }}>
          {items.map((item) => {
            const unread = !item.readAt;
            const archived = !!item.archivedAt;
            return (
              <Box
                key={item.id}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: "10px",
                  border: `1px solid ${tokens.border}`,
                  borderRadius: "10px",
                  p: "12px 14px",
                }}
                style={{ backgroundColor: tokens.cardBackground }}
              >
                <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: "8px", flexWrap: "wrap" }}
                  >
                    <Typography
                      sx={{ fontSize: 13, fontWeight: unread ? 600 : 400 }}
                      style={{ color: tokens.textBody }}
                    >
                      {item.title}
                    </Typography>
                    {unread && (
                      <Chip
                        label={t("notifications.page.unreadTag")}
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: 10.5 }}
                      />
                    )}
                    {archived && (
                      <Chip
                        label={t("notifications.page.archivedTag")}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10.5 }}
                      />
                    )}
                  </Stack>
                  {item.body && (
                    <Typography
                      sx={{ fontSize: 11.5, mt: "3px", whiteSpace: "pre-line" }}
                      style={{ color: tokens.textFaint }}
                    >
                      {item.body}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: 11, mt: "3px" }} style={{ color: tokens.textFaint }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography>
                </Box>

                <Stack direction="row" sx={{ gap: "4px", flex: "none" }}>
                  {unread && (
                    <IconButton
                      size="small"
                      onClick={() => markRead(item.id)}
                      title={t("notifications.page.markRead")}
                    >
                      <CheckIcon sx={{ fontSize: 16 }} style={{ color: tokens.green }} />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => remove(item.id)}
                    title={t("notifications.page.delete")}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} style={{ color: tokens.red }} />
                  </IconButton>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {cursor && (
        <Box
          component="button"
          disabled={pending}
          onClick={loadMore}
          sx={{
            mt: "14px",
            border: `1px solid ${tokens.borderStrong}`,
            borderRadius: "8px",
            p: "8px 16px",
            fontSize: 12.5,
            cursor: "pointer",
            background: "none",
          }}
          style={{ color: tokens.textBody }}
        >
          {t("notifications.page.loadMore")}
        </Box>
      )}
    </Box>
  );
}
