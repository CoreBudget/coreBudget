"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";

export interface JobRunRow {
  id: string;
  jobName: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "failed";
  detail: string | null;
  errorMessage: string | null;
}

export const JOB_LABEL_KEYS: Record<string, string> = {
  automatic_backup: "admin.health.jobs.automaticBackup",
  session_cleanup: "admin.health.jobs.sessionCleanup",
  audit_log_retention: "admin.health.jobs.auditLogRetention",
  error_log_retention: "admin.health.jobs.errorLogRetention",
  process_due_repeating_transactions: "admin.health.jobs.processDueRepeatingTransactions",
  category_plan_snapshot: "admin.health.jobs.categoryPlanSnapshot",
  category_plan_snapshot_startup_check: "admin.health.jobs.categoryPlanSnapshot",
  send_push_notifications: "admin.health.jobs.sendPushNotifications",
};

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return "-";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function JobHistory({
  runs,
  initialRowsPerPage,
}: {
  runs: JobRunRow[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const pageRuns = runs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const statusColor: Record<JobRunRow["status"], string> = {
    completed: tokens.green,
    failed: tokens.red,
    running: tokens.blue,
  };

  const statusLabel: Record<JobRunRow["status"], string> = {
    completed: t("admin.health.status.completed"),
    failed: t("admin.health.status.failed"),
    running: t("admin.health.status.running"),
  };

  return (
    <Box>
      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.health.jobHistory.columns.job")}</TableCell>
              <TableCell>{t("admin.health.jobHistory.columns.started")}</TableCell>
              <TableCell>{t("admin.health.jobHistory.columns.duration")}</TableCell>
              <TableCell>{t("admin.health.jobHistory.columns.status")}</TableCell>
              <TableCell>{t("admin.health.jobHistory.columns.detail")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRuns.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
                    {t("admin.health.jobHistory.empty")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {pageRuns.map((r) => (
              <TableRow key={r.id}>
                <TableCell
                  sx={{ fontSize: 12.5, fontWeight: 500 }}
                  style={{ color: tokens.textBody }}
                >
                  {JOB_LABEL_KEYS[r.jobName] ? td(t, JOB_LABEL_KEYS[r.jobName]) : r.jobName}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                  {new Date(r.startedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                  {formatDuration(r.startedAt, r.completedAt)}
                </TableCell>
                <TableCell
                  sx={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase" }}
                  style={{ color: statusColor[r.status] }}
                >
                  {statusLabel[r.status]}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                  {r.status === "failed"
                    ? (r.errorMessage ?? t("admin.health.jobHistory.failed"))
                    : (r.detail ?? "-")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={runs.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Box>
    </Box>
  );
}
