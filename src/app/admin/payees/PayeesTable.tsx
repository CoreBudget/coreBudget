"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import SearchIcon from "@mui/icons-material/Search";
import SectionHeader from "../_shared/SectionHeader";
import AdminButton from "../_shared/AdminButton";
import Field from "../../_shared/Field";
import ConfirmDialog from "../../_shared/ConfirmDialog";
import { useTokens } from "@/theme";
import { formatDateOnly } from "@/lib/date";
import {
  addRenamingRuleAction,
  deletePayeeAction,
  mergePayeeAction,
  updatePayeeAction,
} from "./actions";
import CreatePayeeDialog from "./CreatePayeeDialog";
import { MATCH_TYPES, MATCH_TYPE_LABEL_KEYS } from "./matchTypes";
import { td } from "@/lib/i18n/translateDynamicKey";
import PayeesFiltersPanel, { EMPTY_PAYEE_FILTERS, type PayeeFilters } from "./PayeesFiltersPanel";

export interface PayeeRow {
  id: string;
  name: string;
  includeInList: boolean;
  enableAutoCategory: boolean;
  ruleCount: number;
  txnCount: number;
  lastUsed: string | null;
}

export default function PayeesTable({
  query,
  payees,
  initialRowsPerPage,
}: {
  query: string;
  payees: PayeeRow[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [mergeOpenId, setMergeOpenId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [addRuleOpenId, setAddRuleOpenId] = useState<string | null>(null);
  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const [editIncludeInList, setEditIncludeInList] = useState(false);
  const [editEnableAutoCategory, setEditEnableAutoCategory] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const [filters, setFilters] = useState<PayeeFilters>(EMPTY_PAYEE_FILTERS);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const filteredPayees = payees.filter((p) => {
    if (filters.startingLetter && !p.name.toUpperCase().startsWith(filters.startingLetter)) {
      return false;
    }
    if (filters.minTxnCount !== "" && p.txnCount <= Number(filters.minTxnCount)) return false;
    if (filters.lastUsedSince && (!p.lastUsed || p.lastUsed < filters.lastUsedSince)) return false;
    if (filters.minRuleCount !== "" && p.ruleCount <= Number(filters.minRuleCount)) return false;
    return true;
  });
  const pageRows = filteredPayees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function handleFiltersChange(next: PayeeFilters) {
    setFilters(next);
    setPage(0);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (search === query) return;
      router.replace(search ? `/admin/payees?q=${encodeURIComponent(search)}` : "/admin/payees");
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function handleDelete() {
    if (!deleteTargetId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await deletePayeeAction(deleteTargetId);
      if (result.error) setError(result.error);
      setDeleteTargetId(null);
      router.refresh();
    });
  }

  function handleMerge(targetId: string) {
    if (!mergeSourceId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await mergePayeeAction(mergeSourceId, targetId);
      if (result.error) {
        setError(result.error);
      } else {
        setMergeOpenId(null);
        setMergeSourceId("");
      }
      router.refresh();
    });
  }

  function handleAddRule(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await addRenamingRuleAction({}, formData);
      if (result.error) setError(result.error);
      else setAddRuleOpenId(null);
      router.refresh();
    });
  }

  function handleUpdatePayee(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await updatePayeeAction({}, formData);
      if (result.error) setError(result.error);
      else setEditOpenId(null);
      router.refresh();
    });
  }

  return (
    <Box>
      <SectionHeader
        title={t("admin.payees.title")}
        subtitle={t("admin.payees.subtitle")}
        action={<CreatePayeeDialog />}
      />

      <Stack
        component="form"
        direction="row"
        sx={{ gap: 1, mb: 2 }}
        onSubmit={(e) => {
          e.preventDefault();
          router.replace(
            search ? `/admin/payees?q=${encodeURIComponent(search)}` : "/admin/payees",
          );
        }}
      >
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.payees.searchPlaceholder")}
          aria-label={t("admin.payees.searchPlaceholder")}
          size="small"
          fullWidth
          sx={{ maxWidth: 320 }}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon sx={{ fontSize: 18, mr: "6px" }} style={{ color: tokens.textFaint }} />
              ),
            },
          }}
        />
        <PayeesFiltersPanel filters={filters} onChange={handleFiltersChange} />
      </Stack>

      {error && (
        <Typography sx={{ fontSize: 12.5, color: "error.main", mb: 2 }}>{td(t, error)}</Typography>
      )}

      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.payees.columns.name")}</TableCell>
              <TableCell>{t("admin.payees.columns.txns")}</TableCell>
              <TableCell>{t("admin.payees.columns.lastUsed")}</TableCell>
              <TableCell>{t("admin.payees.columns.renamingRules")}</TableCell>
              <TableCell>{t("admin.payees.columns.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
                    {t("admin.payees.noSearchResults")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {pageRows.map((p) => (
              <Fragment key={p.id}>
                <TableRow>
                  <TableCell sx={{ fontSize: 13 }}>
                    <Link
                      href={`/admin/payees/${p.id}`}
                      style={{
                        fontWeight: 500,
                        color: tokens.textBody,
                        textDecoration: "underline",
                      }}
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textMuted }}>
                    {p.txnCount}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                    {p.lastUsed
                      ? formatDateOnly(p.lastUsed, { dateStyle: "medium" })
                      : t("admin.payees.never")}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: 12 }}
                    style={{ color: p.ruleCount ? tokens.textSecondary : tokens.textDisabled }}
                  >
                    {p.ruleCount
                      ? t("admin.payees.ruleCount", { count: p.ruleCount })
                      : t("admin.payees.noRules")}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" sx={{ gap: "6px", flexWrap: "wrap" }}>
                      <AdminButton
                        startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          setEditIncludeInList(p.includeInList);
                          setEditEnableAutoCategory(p.enableAutoCategory);
                          setEditOpenId(p.id);
                          setError(undefined);
                        }}
                      >
                        {t("common.edit")}
                      </AdminButton>
                      <AdminButton
                        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          setAddRuleOpenId(p.id);
                          setMergeOpenId(null);
                          setError(undefined);
                        }}
                      >
                        {t("admin.payees.detail.addRule")}
                      </AdminButton>
                      <AdminButton
                        startIcon={<MergeTypeIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          setMergeOpenId(p.id);
                          setAddRuleOpenId(null);
                          setMergeSourceId("");
                          setError(undefined);
                        }}
                      >
                        {t("admin.payees.merge")}
                      </AdminButton>
                      <AdminButton
                        danger
                        disabled={pending}
                        startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                        onClick={() => setDeleteTargetId(p.id)}
                      >
                        {t("common.delete")}
                      </AdminButton>
                    </Stack>
                  </TableCell>
                </TableRow>

                {addRuleOpenId === p.id && (
                  <TableRow key={`${p.id}-add-rule`}>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <Stack
                        component="form"
                        action={handleAddRule}
                        direction="row"
                        sx={{
                          gap: 1.5,
                          alignItems: "center",
                          px: "16px",
                          py: "10px",
                          flexWrap: "wrap",
                        }}
                        style={{ backgroundColor: `${tokens.blue}0f` }}
                      >
                        <input type="hidden" name="payeeId" value={p.id} />
                        <TextField
                          name="matchType"
                          select
                          size="small"
                          defaultValue="contains"
                          aria-label={t("admin.payees.detail.matchTypeLabel")}
                          sx={{ width: 140 }}
                        >
                          {MATCH_TYPES.map((mt) => (
                            <MenuItem key={mt} value={mt}>
                              {td(t, MATCH_TYPE_LABEL_KEYS[mt])}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          name="pattern"
                          size="small"
                          placeholder={t("admin.payees.detail.patternPlaceholder")}
                          aria-label={t("admin.payees.detail.patternPlaceholder")}
                          sx={{ width: 220 }}
                        />
                        <AdminButton
                          type="submit"
                          variant="contained"
                          disabled={pending}
                          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                        >
                          {t("common.save")}
                        </AdminButton>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setAddRuleOpenId(null)}
                          sx={{
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            border: "none",
                            background: "none",
                            padding: 0,
                            margin: 0,
                            font: "inherit",
                          }}
                          style={{ color: tokens.textMuted }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                          {t("common.cancel")}
                        </Box>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}

                {mergeOpenId === p.id && (
                  <TableRow key={`${p.id}-merge`}>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <Stack
                        direction="row"
                        sx={{ gap: 1.5, alignItems: "center", px: "16px", py: "10px" }}
                        style={{ backgroundColor: `${tokens.blue}0f` }}
                      >
                        <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                          {t("admin.payees.mergeInto", { name: p.name })}
                        </Typography>
                        <TextField
                          select
                          size="small"
                          value={mergeSourceId}
                          aria-label={t("admin.payees.selectPayeePlaceholder")}
                          onChange={(e) => setMergeSourceId(e.target.value)}
                          sx={{ minWidth: 220 }}
                          slotProps={{ select: { displayEmpty: true } }}
                        >
                          <MenuItem value="" disabled>
                            {t("admin.payees.selectPayeePlaceholder")}
                          </MenuItem>
                          {payees
                            .filter((o) => o.id !== p.id)
                            .map((o) => (
                              <MenuItem key={o.id} value={o.id}>
                                {o.name}
                              </MenuItem>
                            ))}
                        </TextField>
                        <AdminButton
                          variant="contained"
                          disabled={!mergeSourceId || pending}
                          startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleMerge(p.id)}
                        >
                          {t("admin.payees.confirmMerge")}
                        </AdminButton>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setMergeOpenId(null)}
                          sx={{
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            border: "none",
                            background: "none",
                            padding: 0,
                            margin: 0,
                            font: "inherit",
                          }}
                          style={{ color: tokens.textMuted }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                          {t("common.cancel")}
                        </Box>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredPayees.length}
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

      <Dialog
        open={editOpenId !== null}
        onClose={() => setEditOpenId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.payees.detail.editPayee")}</DialogTitle>
        <Stack component="form" action={handleUpdatePayee} key={editOpenId ?? "closed"}>
          <input type="hidden" name="id" value={editOpenId ?? ""} />
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("admin.payees.createPayeeDialog.nameLabel")} htmlFor="edit-name">
                <TextField
                  id="edit-name"
                  name="name"
                  defaultValue={payees.find((p) => p.id === editOpenId)?.name ?? ""}
                  required
                  fullWidth
                />
              </Field>
              <FormControlLabel
                control={
                  <Checkbox
                    name="includeInList"
                    checked={editIncludeInList}
                    onChange={(e) => setEditIncludeInList(e.target.checked)}
                  />
                }
                label={t("admin.payees.detail.showInPicker")}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="enableAutoCategory"
                    checked={editEnableAutoCategory}
                    onChange={(e) => setEditEnableAutoCategory(e.target.checked)}
                  />
                }
                label={t("admin.payees.createPayeeDialog.enableAutoCategory")}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpenId(null)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t("admin.payees.deleteConfirm.title")}
        description={t("admin.payees.deleteConfirm.description", {
          name: payees.find((p) => p.id === deleteTargetId)?.name ?? "",
        })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </Box>
  );
}
