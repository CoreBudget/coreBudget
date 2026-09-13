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

export interface ErrorLogRow {
  id: string;
  source: "react_error_boundary" | "uncaught_exception" | "unhandled_rejection";
  message: string;
  stack: string | null;
  path: string | null;
  createdAt: string;
}

export default function ErrorLogPanel({
  errors,
  initialRowsPerPage,
}: {
  errors: ErrorLogRow[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const pageErrors = errors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, mb: "12px" }} style={{ color: tokens.textMuted }}>
        {t("admin.health.errorLog.subtitle")}
      </Typography>
      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.health.errorLog.columns.time")}</TableCell>
              <TableCell>{t("admin.health.errorLog.columns.source")}</TableCell>
              <TableCell>{t("admin.health.errorLog.columns.message")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageErrors.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
                    {t("admin.health.errorLog.empty")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {pageErrors.map((e) => {
              const expanded = expandedIds.has(e.id);
              return (
                <TableRow key={e.id}>
                  <TableCell
                    sx={{ fontSize: 12, verticalAlign: "top" }}
                    style={{ color: tokens.textMuted }}
                  >
                    {new Date(e.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: 11.5, fontWeight: 700, verticalAlign: "top" }}
                    style={{ color: tokens.red }}
                  >
                    {td(t, `admin.health.errorLog.sources.${e.source}`)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textBody }}>
                    <Box>{e.message}</Box>
                    {e.path && (
                      <Typography
                        sx={{ fontSize: 11, mt: "2px" }}
                        style={{ color: tokens.textFaint }}
                      >
                        {e.path}
                      </Typography>
                    )}
                    {e.stack && (
                      <Box
                        component="button"
                        onClick={() => toggleExpanded(e.id)}
                        sx={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          mt: "4px",
                          p: 0,
                        }}
                        style={{ color: tokens.blue }}
                      >
                        {expanded
                          ? t("admin.health.errorLog.hideStack")
                          : t("admin.health.errorLog.showStack")}
                      </Box>
                    )}
                    {expanded && e.stack && (
                      <Box
                        component="pre"
                        sx={{
                          fontSize: 10.5,
                          mt: "6px",
                          p: "8px",
                          borderRadius: "6px",
                          overflowX: "auto",
                          whiteSpace: "pre-wrap",
                        }}
                        style={{ color: tokens.textFaint, backgroundColor: tokens.menuBackground }}
                      >
                        {e.stack}
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={errors.length}
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
