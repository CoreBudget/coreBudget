"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ReplayIcon from "@mui/icons-material/Replay";
import SectionHeader from "../_shared/SectionHeader";
import AdminButton from "../_shared/AdminButton";
import Pill from "../_shared/Pill";
import ConfirmDialog from "../../_shared/ConfirmDialog";
import { useTokens } from "@/theme";
import {
  clearFailedBackupsAction,
  deleteBackupAction,
  retryBackupAction,
  runBackupNowAction,
  toggleAutoBackupAction,
} from "./actions";
import { td } from "@/lib/i18n/translateDynamicKey";

interface BackupRow {
  id: string;
  startedAt: string;
  type: string;
  status: string;
  sizeBytes: number | null;
  errorMessage: string | null;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  const mb = bytes / 1024 / 1024;
  return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(0)} MB`;
}

export default function BackupsPanel({
  autoBackupEnabled,
  backups,
  initialRowsPerPage,
}: {
  autoBackupEnabled: boolean;
  backups: BackupRow[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const failedCount = backups.filter((b) => b.status === "failed").length;
  const pageBackups = backups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function handleToggle() {
    startTransition(async () => {
      await toggleAutoBackupAction();
      router.refresh();
    });
  }

  function handleRunNow() {
    startTransition(async () => {
      await runBackupNowAction();
      router.refresh();
    });
  }

  function handleRetry(id: string) {
    startTransition(async () => {
      await retryBackupAction(id);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      await deleteBackupAction(deleteTargetId);
      setDeleteTargetId(null);
      router.refresh();
    });
  }

  function handleClearFailed() {
    startTransition(async () => {
      await clearFailedBackupsAction();
      router.refresh();
    });
  }

  return (
    <Box>
      <SectionHeader
        title={t("admin.backups.title")}
        subtitle={t("admin.backups.subtitle")}
        action={
          <Stack direction="row" sx={{ gap: 1 }}>
            {failedCount > 1 && (
              <AdminButton
                disabled={pending}
                startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                onClick={handleClearFailed}
              >
                {t("admin.backups.clearFailed", { count: failedCount })}
              </AdminButton>
            )}
            <AdminButton
              variant="contained"
              disabled={pending}
              startIcon={<PlayArrowIcon sx={{ fontSize: 14 }} />}
              onClick={handleRunNow}
            >
              {t("admin.backups.runNow")}
            </AdminButton>
          </Stack>
        }
      />

      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          p: "18px",
          mb: "20px",
        }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} style={{ color: tokens.textBody }}>
            {t("admin.backups.autoBackup.title")}
          </Typography>
          <Typography sx={{ fontSize: 11.5, mt: "2px" }} style={{ color: tokens.textMuted }}>
            {t("admin.backups.autoBackup.description")}
          </Typography>
        </Box>
        <Switch
          checked={autoBackupEnabled}
          onChange={handleToggle}
          disabled={pending}
          slotProps={{ input: { "aria-label": t("admin.backups.autoBackup.toggleAriaLabel") } }}
        />
      </Stack>

      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.backups.columns.date")}</TableCell>
              <TableCell>{t("admin.backups.columns.type")}</TableCell>
              <TableCell>{t("admin.backups.columns.size")}</TableCell>
              <TableCell>{t("admin.backups.columns.status")}</TableCell>
              <TableCell>{t("admin.backups.columns.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageBackups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
                    {t("admin.backups.empty")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {pageBackups.map((b) => (
              <TableRow key={b.id}>
                <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                  {new Date(b.startedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </TableCell>
                <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
                  {b.type === "automatic"
                    ? t("admin.backups.type.automatic")
                    : t("admin.backups.type.manual")}
                </TableCell>
                <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
                  {formatSize(b.sizeBytes)}
                </TableCell>
                <TableCell>
                  <Stack sx={{ gap: "4px" }}>
                    <Pill
                      label={td(t, `admin.backups.status.${b.status}`)}
                      color={
                        b.status === "completed"
                          ? tokens.green
                          : b.status === "running"
                            ? tokens.amber
                            : tokens.red
                      }
                    />
                    {b.status === "failed" && b.errorMessage && (
                      <Typography sx={{ fontSize: 11 }} style={{ color: tokens.red }}>
                        {b.errorMessage}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  {b.status === "completed" ? (
                    <a href={`/admin/backups/${b.id}/download`} style={{ textDecoration: "none" }}>
                      <AdminButton startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}>
                        {t("admin.backups.download")}
                      </AdminButton>
                    </a>
                  ) : b.status === "failed" ? (
                    <Stack direction="row" sx={{ gap: "6px" }}>
                      <AdminButton
                        disabled={pending}
                        startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
                        onClick={() => handleRetry(b.id)}
                      >
                        {t("admin.backups.retry")}
                      </AdminButton>
                      <AdminButton
                        danger
                        disabled={pending}
                        startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setDeleteTargetId(b.id)}
                        aria-label={t("admin.backups.deleteAriaLabel")}
                      >
                        {t("common.delete")}
                      </AdminButton>
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textDisabled }}>
                      {t("admin.backups.inProgress")}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={backups.length}
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

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t("admin.backups.deleteConfirm.title")}
        description={t("admin.backups.deleteConfirm.description")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}
