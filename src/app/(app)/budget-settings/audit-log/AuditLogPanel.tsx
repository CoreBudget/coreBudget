"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import SectionHeader from "../../../admin/_shared/SectionHeader";
import { useTokens } from "@/theme";
import { formatDateTime } from "@/lib/date";
import { fetchAuditLogPageAction } from "./actions";
import { AUDIT_LOG_PAGE_SIZE_OPTIONS, type AuditLogEntryRow } from "./constants";

export default function AuditLogPanel({
  timezone,
  dateFormatPreference,
  entries: initialEntries,
  totalCount,
  initialRowsPerPage,
}: {
  timezone: string | null;
  dateFormatPreference: string | null;
  entries: AuditLogEntryRow[];
  totalCount: number;
  initialRowsPerPage: number;
}) {
  const t = useTranslations("budgetSettings.auditLog");
  const tokens = useTokens();
  const [entries, setEntries] = useState(initialEntries);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [, startTransition] = useTransition();

  function goToPage(nextPage: number, nextRowsPerPage: number) {
    startTransition(async () => {
      const rows = await fetchAuditLogPageAction(nextPage, nextRowsPerPage);
      setEntries(rows);
    });
  }

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />

      <Alert severity="info" sx={{ mb: "14px" }}>
        {t("retentionFooter")}
      </Alert>

      {entries.length === 0 ? (
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {t("empty")}
        </Typography>
      ) : (
        <Box
          sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}
        >
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{t("dateColumn")}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{t("userColumn")}</TableCell>
                  <TableCell>{t("changeColumn")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell
                      sx={{ fontSize: 12, whiteSpace: "nowrap" }}
                      style={{ color: tokens.textFaint }}
                    >
                      {formatDateTime(entry.createdAt, timezone, dateFormatPreference)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {entry.actorName}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                      {entry.summary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, p) => {
              setPage(p);
              goToPage(p, rowsPerPage);
            }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              const next = Number(e.target.value);
              setRowsPerPage(next);
              setPage(0);
              goToPage(0, next);
            }}
            rowsPerPageOptions={AUDIT_LOG_PAGE_SIZE_OPTIONS}
          />
        </Box>
      )}
    </Box>
  );
}
