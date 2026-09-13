"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useTokens } from "@/theme";
import { useToast } from "../ToastProvider";
import { useServerAction } from "../useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { parseCsvAction } from "../csvImportActions";

export interface CsvImportField {
  key: string;
  label: string;
  required?: boolean;
  constantOptions?: { value: string; label: string }[];
  hint?: string;
}

const SKIP = "__skip__";
const STEP_KEYS = ["stepUpload", "stepMap", "stepPreview"] as const;

export default function CsvImportModal({
  open,
  onClose,
  title,
  fields,
  onImport,
  excludeRow,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fields: CsvImportField[];
  onImport: (rows: Record<string, string>[]) => Promise<{ error?: string; imported?: number }>;
  excludeRow?: (mappedRow: Record<string, string>) => boolean;
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const [, startTransition] = useTransition();
  const { pending, run } = useServerAction();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [parseError, setParseError] = useState<string>();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [constants, setConstants] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState<string>();

  function reset() {
    setStep(0);
    setParseError(undefined);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setConstants({});
    setImportError(undefined);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function guessMapping(detectedHeaders: string[]): Record<string, string> {
    const guess: Record<string, string> = {};
    for (const field of fields) {
      if (field.constantOptions) continue;
      const match = detectedHeaders.find((h) => {
        const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          norm === field.key.toLowerCase() ||
          norm === field.label.toLowerCase().replace(/[^a-z0-9]/g, "") ||
          norm.includes(field.key.toLowerCase())
        );
      });
      guess[field.key] = match ?? SKIP;
    }
    return guess;
  }

  async function handleFile(file: File) {
    setParseError(undefined);
    const text = await file.text();
    startTransition(async () => {
      const result = await parseCsvAction(text);
      if (result.error || result.rows.length === 0) {
        setParseError(result.error ?? "csvImport.errors.empty");
        return;
      }
      setHeaders(result.headers);
      setRows(result.rows);
      setMapping(guessMapping(result.headers));
      setStep(1);
    });
  }

  const { mappedRows, excludedCount } = useMemo(() => {
    const all = rows.map((row) => {
      const out: Record<string, string> = {};
      for (const field of fields) {
        if (field.constantOptions) {
          out[field.key] = constants[field.key] ?? "";
          continue;
        }
        const col = mapping[field.key];
        out[field.key] = col && col !== SKIP ? (row[col] ?? "") : "";
      }
      return out;
    });
    const kept = excludeRow ? all.filter((r) => !excludeRow(r)) : all;
    return { mappedRows: kept, excludedCount: all.length - kept.length };
  }, [rows, mapping, constants, fields, excludeRow]);

  const missingRequired = fields.filter((f) =>
    f.required && f.constantOptions ? !constants[f.key] : f.required && mapping[f.key] === SKIP,
  );

  function handleImport() {
    setImportError(undefined);
    run(
      () => onImport(mappedRows),
      (result) => {
        showToast(
          t("csvImport.importSuccessToast", { count: result.imported ?? mappedRows.length }),
          "success",
        );
        handleClose();
      },
      (err) => setImportError(err),
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      sx={{ "& .MuiDialog-paper": { width: "92vw" } }}
    >
      <Box
        sx={{ display: "flex", flexDirection: "column" }}
        style={{ backgroundColor: tokens.pageBackground }}
      >
        <Box style={{ borderBottom: `1px solid ${tokens.border}` }}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center", p: "16px 20px 4px" }}
          >
            <Typography
              sx={{ fontSize: 16, fontWeight: 700 }}
              style={{ color: tokens.textPrimary }}
            >
              {title}
            </Typography>
            <IconButton size="small" onClick={handleClose} aria-label={t("common.close")}>
              <CloseIcon sx={{ fontSize: 18 }} style={{ color: tokens.textSecondary }} />
            </IconButton>
          </Stack>
          <Box sx={{ px: { xs: "16px", sm: "40px" }, pb: "18px" }}>
            <Stepper activeStep={step}>
              {STEP_KEYS.map((key) => (
                <Step key={key}>
                  <StepLabel>{td(t, `csvImport.${key}`)}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </Box>

        <Box sx={{ maxHeight: "65vh", overflowY: "auto", p: { xs: "16px", sm: "20px 24px" } }}>
          {step === 0 && (
            <Stack sx={{ gap: 2 }}>
              <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }}>
                {t("csvImport.uploadPrompt")}
              </Typography>
              <Box
                component="label"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  p: "32px",
                  borderRadius: "10px",
                  border: `1px dashed ${tokens.borderStrong}`,
                  cursor: "pointer",
                }}
              >
                <UploadFileIcon sx={{ fontSize: 28 }} style={{ color: tokens.textFaint }} />
                <Typography
                  sx={{ fontSize: 13, fontWeight: 500 }}
                  style={{ color: tokens.textBody }}
                >
                  {t("csvImport.chooseFileLabel")}
                </Typography>
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </Box>
              {parseError && <Alert severity="error">{td(t, parseError)}</Alert>}
            </Stack>
          )}

          {step === 1 && (
            <Stack sx={{ gap: 2 }}>
              <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }}>
                {t("csvImport.mapPrompt")}
              </Typography>
              {fields.map((field) => (
                <Stack key={field.key} direction="row" sx={{ alignItems: "center", gap: 2 }}>
                  <Typography
                    sx={{ fontSize: 13, width: 160, flex: "none" }}
                    style={{ color: tokens.textBody }}
                  >
                    {field.label}
                    {field.required && (
                      <Typography component="span" sx={{ color: tokens.red }}>
                        {" *"}
                      </Typography>
                    )}
                    {field.constantOptions && (
                      <Typography
                        component="span"
                        sx={{ fontSize: 10.5, display: "block" }}
                        style={{ color: tokens.textFaint }}
                      >
                        {t("csvImport.appliesToAllRows")}
                      </Typography>
                    )}
                    {field.hint && (
                      <Typography
                        component="span"
                        sx={{ fontSize: 10.5, display: "block" }}
                        style={{ color: tokens.textFaint }}
                      >
                        {field.hint}
                      </Typography>
                    )}
                  </Typography>
                  {field.constantOptions ? (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={constants[field.key] ?? ""}
                      aria-label={field.label}
                      onChange={(e) => setConstants((c) => ({ ...c, [field.key]: e.target.value }))}
                    >
                      {!field.required && <MenuItem value="">{t("csvImport.skipOption")}</MenuItem>}
                      {field.constantOptions.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={mapping[field.key] ?? SKIP}
                      aria-label={field.label}
                      onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
                    >
                      {!field.required && (
                        <MenuItem value={SKIP}>{t("csvImport.skipOption")}</MenuItem>
                      )}
                      {headers.map((h) => (
                        <MenuItem key={h} value={h}>
                          {h}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Stack>
              ))}

              <Box sx={{ mt: "8px" }}>
                <Typography sx={{ fontSize: 11.5, mb: "6px" }} style={{ color: tokens.textFaint }}>
                  {t("csvImport.rawPreviewTitle")}
                </Typography>
                <TableContainer sx={{ border: `1px solid ${tokens.divider}`, borderRadius: "8px" }}>
                  <Table size="small" sx={{ fontSize: 11.5 }}>
                    <TableHead>
                      <TableRow>
                        {headers.map((h) => (
                          <TableCell key={h} style={{ color: tokens.textFaint }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {headers.map((h) => (
                            <TableCell key={h} style={{ color: tokens.textBody }}>
                              {row[h]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          )}

          {step === 2 && (
            <Stack sx={{ gap: 2 }}>
              <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }}>
                {t("csvImport.previewPrompt", { count: mappedRows.length })}
              </Typography>
              {excludedCount > 0 && (
                <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
                  {t("csvImport.excludedRowsNote", { count: excludedCount })}
                </Typography>
              )}
              <TableContainer sx={{ border: `1px solid ${tokens.divider}`, borderRadius: "8px" }}>
                <Table size="small" sx={{ fontSize: 12 }}>
                  <TableHead>
                    <TableRow>
                      {fields.map((f) => (
                        <TableCell key={f.key} style={{ color: tokens.textFaint }}>
                          {f.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mappedRows.slice(0, 20).map((row, i) => (
                      <TableRow key={i}>
                        {fields.map((f) => (
                          <TableCell key={f.key} style={{ color: tokens.textBody }}>
                            {f.constantOptions
                              ? (f.constantOptions.find((o) => o.value === row[f.key])?.label ?? "")
                              : row[f.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {mappedRows.length > 20 && (
                <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
                  {t("csvImport.andMoreRows", { count: mappedRows.length - 20 })}
                </Typography>
              )}
              {importError && <Alert severity="error">{td(t, importError)}</Alert>}
            </Stack>
          )}
        </Box>

        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            p: "14px 24px",
            borderTop: `1px solid ${tokens.border}`,
          }}
        >
          <Button
            onClick={() => setStep((s) => (s === 0 ? 0 : ((s - 1) as 0 | 1 | 2)))}
            disabled={step === 0}
            sx={{ color: "text.secondary" }}
          >
            {t("csvImport.backButton")}
          </Button>
          {step === 1 && (
            <Button
              variant="contained"
              disabled={missingRequired.length > 0}
              onClick={() => setStep(2)}
            >
              {t("csvImport.nextButton")}
            </Button>
          )}
          {step === 2 && (
            <Button variant="contained" disabled={pending} onClick={handleImport}>
              {t("csvImport.importButton", { count: mappedRows.length })}
            </Button>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}
