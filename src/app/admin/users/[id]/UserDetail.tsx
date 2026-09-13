"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import BlockIcon from "@mui/icons-material/Block";
import AdminButton from "../../_shared/AdminButton";
import Pill from "../../_shared/Pill";
import { useTokens } from "@/theme";
import { revokeSessionAction } from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

interface SessionRow {
  id: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  startedAt: string;
  isCurrent: boolean;
}

interface HistoryRow {
  id: string;
  timestamp: string;
  ipAddress: string | null;
  location: string | null;
  browser: string | null;
  os: string | null;
  result: string;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function deviceLabel(browser: string | null, os: string | null, fallback: string): string {
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || fallback;
}

function locationLabel(location: string | null, ipAddress: string | null): string {
  return [location, ipAddress].filter(Boolean).join(" · ") || "-";
}

export default function UserDetail({
  user,
  sessions,
  history,
  initialRowsPerPage,
}: {
  user: { id: string; name: string; email: string; status: string; isAdmin: boolean };
  sessions: SessionRow[];
  history: HistoryRow[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sessionsPage, setSessionsPage] = useState(0);
  const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(initialRowsPerPage);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(initialRowsPerPage);

  const pageSessions = sessions.slice(
    sessionsPage * sessionsRowsPerPage,
    sessionsPage * sessionsRowsPerPage + sessionsRowsPerPage,
  );
  const pageHistory = history.slice(
    historyPage * historyRowsPerPage,
    historyPage * historyRowsPerPage + historyRowsPerPage,
  );

  function handleRevoke(sessionId: string) {
    startTransition(async () => {
      await revokeSessionAction(sessionId);
      router.refresh();
    });
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: "16px" }}>
        <Link href="/admin/users" style={{ color: tokens.textMuted }}>
          {t("admin.shell.nav.users")}
        </Link>{" "}
        / <span style={{ color: tokens.textSecondary }}>{user.name}</span>
      </Typography>

      <Stack direction="row" sx={{ alignItems: "center", gap: "10px", mb: "4px" }}>
        <Typography
          component="h1"
          sx={{ fontSize: 20, fontWeight: 700, color: "text.primary", m: 0 }}
        >
          {user.name}
        </Typography>
        {user.isAdmin && <Pill label={t("admin.users.adminPill")} color={tokens.amber} />}
        <Pill
          label={td(t, `admin.users.status.${user.status}`)}
          color={user.status === "active" ? tokens.green : tokens.red}
        />
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: "20px" }}>
        {user.email}
      </Typography>

      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary", mb: "12px" }}>
        {t("admin.users.detail.activeSessions")}
      </Typography>
      <Box
        sx={{
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          overflow: "hidden",
          mb: "24px",
        }}
      >
        {sessions.length === 0 ? (
          <Typography sx={{ p: 2, fontSize: 12.5, color: "text.disabled" }}>
            {t("admin.users.detail.noActiveSessions")}
          </Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("admin.users.detail.columns.device")}</TableCell>
                  <TableCell>{t("admin.users.detail.columns.location")}</TableCell>
                  <TableCell>{t("admin.users.detail.columns.started")}</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {pageSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Stack direction="row" sx={{ alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          style={{ color: tokens.textBody }}
                        >
                          {deviceLabel(s.browser, s.os, t("admin.users.detail.unknownDevice"))}
                        </Typography>
                        {s.isCurrent && (
                          <Pill label={t("admin.users.detail.thisSession")} color={tokens.blue} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                      {locationLabel(s.location, s.ipAddress)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textSecondary }}>
                      {fmt(s.startedAt)}
                    </TableCell>
                    <TableCell>
                      <AdminButton
                        danger
                        disabled={pending}
                        startIcon={<BlockIcon sx={{ fontSize: 14 }} />}
                        onClick={() => handleRevoke(s.id)}
                      >
                        {t("admin.households.revoke")}
                      </AdminButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={sessions.length}
              page={sessionsPage}
              onPageChange={(_, p) => setSessionsPage(p)}
              rowsPerPage={sessionsRowsPerPage}
              onRowsPerPageChange={(e) => {
                setSessionsRowsPerPage(Number(e.target.value));
                setSessionsPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Box>

      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary", mb: "12px" }}>
        {t("admin.users.detail.loginHistory")}
      </Typography>
      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        {history.length === 0 ? (
          <Typography sx={{ p: 2, fontSize: 12.5, color: "text.disabled" }}>
            {t("admin.users.detail.noLoginHistory")}
          </Typography>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("admin.users.detail.columns.time")}</TableCell>
                  <TableCell>{t("admin.users.detail.columns.location")}</TableCell>
                  <TableCell>{t("admin.users.detail.columns.device")}</TableCell>
                  <TableCell>{t("admin.users.detail.columns.result")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                      {fmt(h.timestamp)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                      {locationLabel(h.location, h.ipAddress)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      style={{ color: tokens.textMuted }}
                    >
                      {deviceLabel(h.browser, h.os, t("admin.users.detail.unknown"))}
                    </TableCell>
                    <TableCell>
                      <Pill
                        label={
                          h.result === "success"
                            ? t("admin.users.detail.loginSuccess")
                            : t("admin.users.detail.loginFailed")
                        }
                        color={h.result === "success" ? tokens.green : tokens.red}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={history.length}
              page={historyPage}
              onPageChange={(_, p) => setHistoryPage(p)}
              rowsPerPage={historyRowsPerPage}
              onRowsPerPageChange={(e) => {
                setHistoryRowsPerPage(Number(e.target.value));
                setHistoryPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
