"use client";

import { Fragment, useState, useTransition } from "react";
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
import AdminButton from "../../_shared/AdminButton";
import Field from "../../../_shared/Field";
import ConfirmDialog from "../../../_shared/ConfirmDialog";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";
import {
  addRenamingRuleAction,
  deleteRenamingRuleAction,
  updatePayeeAction,
  updateRenamingRuleAction,
} from "../actions";
import { MATCH_TYPES, MATCH_TYPE_LABEL_KEYS } from "../matchTypes";

interface Rule {
  id: string;
  matchType: string;
  pattern: string;
}

export default function PayeeDetail({
  payee,
  rules,
  initialRowsPerPage,
}: {
  payee: {
    id: string;
    name: string;
    includeInList: boolean;
    enableAutoCategory: boolean;
    txnCount: number;
  };
  rules: Rule[];
  initialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editIncludeInList, setEditIncludeInList] = useState(payee.includeInList);
  const [editEnableAutoCategory, setEditEnableAutoCategory] = useState(payee.enableAutoCategory);
  const [addOpen, setAddOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const pageRules = rules.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function handleAddRule(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await addRenamingRuleAction({}, formData);
      if (result.error) setError(result.error);
      else setAddOpen(false);
      router.refresh();
    });
  }

  function handleUpdateRule(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateRenamingRuleAction({}, formData);
      if (result.error) setError(result.error);
      else setEditRuleId(null);
      router.refresh();
    });
  }

  function handleDeleteRule() {
    if (!deleteRuleId) return;
    startTransition(async () => {
      await deleteRenamingRuleAction(deleteRuleId);
      setDeleteRuleId(null);
      router.refresh();
    });
  }

  function handleUpdatePayee(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await updatePayeeAction({}, formData);
      if (result.error) setError(result.error);
      else setEditOpen(false);
      router.refresh();
    });
  }

  return (
    <Box>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: "16px" }}>
        <Link href="/admin/payees" style={{ color: tokens.textMuted }}>
          {t("admin.shell.nav.payees")}
        </Link>{" "}
        / <span style={{ color: tokens.textSecondary }}>{payee.name}</span>
      </Typography>

      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: "20px" }}
      >
        <Stack sx={{ gap: "4px" }}>
          <Typography
            component="h1"
            sx={{ fontSize: 20, fontWeight: 700, color: "text.primary", m: 0 }}
          >
            {payee.name}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            {t("admin.payees.detail.transactionCount", { count: payee.txnCount })}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ gap: 1 }}>
          <AdminButton
            startIcon={<EditIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              setEditIncludeInList(payee.includeInList);
              setEditEnableAutoCategory(payee.enableAutoCategory);
              setEditOpen(true);
            }}
          >
            {t("common.edit")}
          </AdminButton>
          <AdminButton
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              setAddOpen(true);
              setEditRuleId(null);
            }}
          >
            {t("admin.payees.detail.addRule")}
          </AdminButton>
        </Stack>
      </Stack>

      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.payees.detail.columns.match")}</TableCell>
              <TableCell>
                {t("admin.payees.detail.columns.pattern", { name: payee.name })}
              </TableCell>
              <TableCell>{t("admin.payees.columns.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {addOpen && (
              <TableRow>
                <TableCell colSpan={3} sx={{ p: 0 }}>
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
                    <input type="hidden" name="payeeId" value={payee.id} />
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
                      onClick={() => setAddOpen(false)}
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

            {error && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography sx={{ fontSize: 12.5, color: "error.main" }}>
                    {td(t, error)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rules.length === 0 && !addOpen && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>
                    {t("admin.payees.detail.noRules")}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {pageRules.map((r) => (
              <Fragment key={r.id}>
                {editRuleId === r.id ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ p: 0 }}>
                      <Stack
                        component="form"
                        action={handleUpdateRule}
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
                        <input type="hidden" name="id" value={r.id} />
                        <TextField
                          name="matchType"
                          select
                          size="small"
                          defaultValue={r.matchType}
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
                          defaultValue={r.pattern}
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
                          onClick={() => setEditRuleId(null)}
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
                ) : (
                  <TableRow>
                    <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                      {td(t, MATCH_TYPE_LABEL_KEYS[r.matchType])}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12.5 }} style={{ color: tokens.textBody }}>
                      {r.pattern}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" sx={{ gap: "6px" }}>
                        <AdminButton
                          startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                          onClick={() => {
                            setEditRuleId(r.id);
                            setAddOpen(false);
                          }}
                        >
                          {t("common.edit")}
                        </AdminButton>
                        <AdminButton
                          danger
                          disabled={pending}
                          startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                          onClick={() => setDeleteRuleId(r.id)}
                        >
                          {t("common.delete")}
                        </AdminButton>
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
          count={rules.length}
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{t("admin.payees.detail.editPayee")}</DialogTitle>
        <Stack component="form" action={handleUpdatePayee}>
          <input type="hidden" name="id" value={payee.id} />
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("admin.payees.createPayeeDialog.nameLabel")} htmlFor="name">
                <TextField id="name" name="name" defaultValue={payee.name} required fullWidth />
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
            <Button onClick={() => setEditOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={deleteRuleId !== null}
        title={t("admin.payees.detail.deleteRuleConfirm.title")}
        description={t("admin.payees.detail.deleteRuleConfirm.description")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onConfirm={handleDeleteRule}
        onCancel={() => setDeleteRuleId(null)}
      />
    </Box>
  );
}
