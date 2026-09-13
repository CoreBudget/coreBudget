"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SectionHeader from "../../../../admin/_shared/SectionHeader";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatDateTime } from "@/lib/date";
import { changePasswordAction, resetTwoFactorAction, revokeSessionAction } from "../actions";

export interface SessionRow {
  id: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  startedAt: string;
  lastActiveAt: string;
}

export interface LoginHistoryRow {
  id: string;
  timestamp: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  result: "success" | "failed_password" | "failed_2fa";
}

function deviceLabel(browser: string | null, os: string | null, fallback: string): string {
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || fallback;
}

function card(tokens: Record<string, string>) {
  return {
    sx: { border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "20px", height: "100%" },
    style: { backgroundColor: tokens.cardBackground },
  };
}

export default function SecurityPanel({
  twoFactorEnabled,
  currentSessionId,
  timezone,
  dateFormatPreference,
  sessions,
  loginHistory,
}: {
  twoFactorEnabled: boolean;
  currentSessionId: string | null;
  timezone: string | null;
  dateFormatPreference: string | null;
  sessions: SessionRow[];
  loginHistory: LoginHistoryRow[];
}) {
  const t = useTranslations("settings.security");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const { pending, run } = useServerAction();

  const [passwordError, setPasswordError] = useState<string>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordMismatch = !!(newPassword && confirmPassword && newPassword !== confirmPassword);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string>();

  function handleChangePassword(formData: FormData) {
    setPasswordError(undefined);
    run(
      () => changePasswordAction({}, formData),
      () => {
        showToast(t("passwordSuccessToast"), "success");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      },
      (err) => setPasswordError(err),
    );
  }

  function handleResetTwoFactor(formData: FormData) {
    setResetError(undefined);
    run(
      () => resetTwoFactorAction({}, formData),
      () => {
        setResetOpen(false);
        showToast(t("twoFactorResetSuccessToast"), "success");
        router.refresh();
      },
      (err) => setResetError(err),
    );
  }

  function handleRevoke(sessionId: string) {
    run(
      () => revokeSessionAction(sessionId),
      () => {
        showToast(t("revokeSuccessToast"), "success");
        router.refresh();
      },
    );
  }

  const otherSessions = useMemo(
    () => sessions.filter((s) => s.id !== currentSessionId),
    [sessions, currentSessionId],
  );

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />

      <Stack sx={{ gap: "14px" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: "14px",
            alignItems: "stretch",
          }}
        >
          <Stack
            component="form"
            action={handleChangePassword}
            sx={{ gap: 2, ...card(tokens).sx }}
            style={card(tokens).style}
          >
            <TextField
              name="currentPassword"
              type="password"
              label={t("currentPasswordLabel")}
              size="small"
              fullWidth
            />
            <TextField
              name="newPassword"
              type="password"
              label={t("newPasswordLabel")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              name="confirmPassword"
              type="password"
              label={t("confirmPasswordLabel")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              size="small"
              fullWidth
            />
            {passwordMismatch && (
              <Typography sx={{ fontSize: 11.5 }} style={{ color: tokens.red }}>
                {td(tRoot, "auth.shared.errors.passwordMismatch")}
              </Typography>
            )}
            {passwordError && <Alert severity="error">{td(tRoot, passwordError)}</Alert>}
            <Box>
              <AdminButton
                type="submit"
                variant="contained"
                disabled={pending || passwordMismatch || !newPassword}
              >
                {t("updatePasswordButton")}
              </AdminButton>
            </Box>
          </Stack>

          <Stack sx={{ gap: "6px", ...card(tokens).sx }} style={card(tokens).style}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: tokens.textBody }}>
              {t("twoFactorTitle")}
            </Typography>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: "4px" }}>
              <Box
                sx={{ px: "9px", py: "3px", borderRadius: "999px", fontSize: 11, fontWeight: 600 }}
                style={{
                  backgroundColor: twoFactorEnabled ? `${tokens.green}22` : `${tokens.textFaint}22`,
                  color: twoFactorEnabled ? tokens.green : tokens.textFaint,
                }}
              >
                {twoFactorEnabled ? t("twoFactorEnabledStatus") : t("twoFactorDisabledStatus")}
              </Box>
            </Stack>
            <Typography sx={{ fontSize: 11.5, mt: "6px" }} style={{ color: tokens.textFaint }}>
              {t("twoFactorResetHint")}
            </Typography>
            <Box sx={{ mt: "8px" }}>
              <AdminButton onClick={() => setResetOpen(true)}>
                {t("twoFactorResetButton")}
              </AdminButton>
            </Box>
          </Stack>
        </Box>

        <Stack sx={{ gap: "4px", ...card(tokens).sx }} style={card(tokens).style}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: tokens.textBody }}>
            {t("sessionsTitle")}
          </Typography>
          <Typography sx={{ fontSize: 11.5, mb: "8px" }} style={{ color: tokens.textFaint }}>
            {t("sessionsSubtitle")}
          </Typography>

          {sessions.map((s, i) => (
            <Stack
              key={s.id}
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                py: "10px",
                borderTop: i > 0 ? `1px solid ${tokens.divider}` : "none",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" sx={{ alignItems: "center", gap: "8px" }}>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    style={{ color: tokens.textBody }}
                  >
                    {deviceLabel(s.browser, s.os, t("unknownDevice"))}
                  </Typography>
                  {s.id === currentSessionId && (
                    <Box
                      sx={{
                        px: "8px",
                        py: "2px",
                        borderRadius: "999px",
                        fontSize: 10.5,
                        fontWeight: 600,
                      }}
                      style={{ backgroundColor: `${tokens.blue}26`, color: tokens.blue }}
                    >
                      {t("currentDeviceBadge")}
                    </Box>
                  )}
                </Stack>
                <Typography sx={{ fontSize: 11, mt: "2px" }} style={{ color: tokens.textFaint }}>
                  {[s.location, s.ipAddress].filter(Boolean).join(" · ")}
                </Typography>
                <Typography sx={{ fontSize: 11, mt: "2px" }} style={{ color: tokens.textFaint }}>
                  {t("startedLabel", {
                    date: formatDateTime(s.startedAt, timezone, dateFormatPreference),
                  })}
                  {" · "}
                  {t("lastActiveLabel", {
                    date: formatDateTime(s.lastActiveAt, timezone, dateFormatPreference),
                  })}
                </Typography>
              </Box>
              {s.id !== currentSessionId && (
                <AdminButton danger disabled={pending} onClick={() => handleRevoke(s.id)}>
                  {t("revokeButton")}
                </AdminButton>
              )}
            </Stack>
          ))}

          {otherSessions.length === 0 && (
            <Typography sx={{ fontSize: 12, mt: "4px" }} style={{ color: tokens.textFaint }}>
              {t("noOtherSessions")}
            </Typography>
          )}
        </Stack>

        <Stack sx={{ gap: "4px", ...card(tokens).sx }} style={card(tokens).style}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: tokens.textBody }}>
            {t("loginHistoryTitle")}
          </Typography>
          <Typography sx={{ fontSize: 11.5, mb: "8px" }} style={{ color: tokens.textFaint }}>
            {t("loginHistorySubtitle")}
          </Typography>

          {loginHistory.map((entry, i) => (
            <Stack
              key={entry.id}
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                py: "8px",
                borderTop: i > 0 ? `1px solid ${tokens.divider}` : "none",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                  {deviceLabel(entry.browser, entry.os, t("unknownDevice"))}
                </Typography>
                <Typography sx={{ fontSize: 11, mt: "2px" }} style={{ color: tokens.textFaint }}>
                  {[
                    formatDateTime(entry.timestamp, timezone, dateFormatPreference),
                    entry.location,
                    entry.ipAddress,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Box>
              <Box
                sx={{ px: "9px", py: "3px", borderRadius: "999px", fontSize: 11, fontWeight: 600 }}
                style={{
                  backgroundColor:
                    entry.result === "success" ? `${tokens.green}22` : `${tokens.red}22`,
                  color: entry.result === "success" ? tokens.green : tokens.red,
                }}
              >
                {td(t, `loginResults.${entry.result}`)}
              </Box>
            </Stack>
          ))}

          {loginHistory.length === 0 && (
            <Typography sx={{ fontSize: 12, mt: "4px" }} style={{ color: tokens.textFaint }}>
              {t("noLoginHistory")}
            </Typography>
          )}
        </Stack>
      </Stack>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{t("twoFactorResetDialogTitle")}</DialogTitle>
        <Stack component="form" action={handleResetTwoFactor}>
          <DialogContent>
            <Typography sx={{ fontSize: 12.5, mb: 2 }} style={{ color: tokens.textFaint }}>
              {t("twoFactorResetDialogBody")}
            </Typography>
            <TextField
              name="currentPassword"
              type="password"
              label={t("currentPasswordLabel")}
              size="small"
              fullWidth
              autoFocus
            />
            {resetError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {td(tRoot, resetError)}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setResetOpen(false)} sx={{ color: "text.secondary" }}>
              {tRoot("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" color="error" disabled={pending}>
              {t("twoFactorResetConfirmButton")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>
    </Box>
  );
}
