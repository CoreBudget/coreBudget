"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { LineChart } from "@mui/x-charts/LineChart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/Edit";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Field from "../../../../_shared/Field";
import ConfirmDialog from "../../../../_shared/ConfirmDialog";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useIsMobile } from "../../../useIsMobile";
import { useTokens } from "@/theme";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { ASSET_TYPE_LABEL_KEYS, assetTypeLabel } from "../../netWorthTypeLabels";
import { ASSET_TYPE_ICONS } from "../../netWorthTypeIcons";
import { deleteAssetAction, recordAssetValueAction, updateAssetAction } from "../../actions";

export interface AssetDetail {
  id: string;
  name: string;
  type: string;
  value: string;
  description: string | null;
  purchaseDate: string | null;
}

export interface AssetHistoryRow {
  id: string;
  date: string;
  value: string;
  description: string | null;
}

export default function AssetDetailView({
  canEdit,
  locale,
  currencyCode,
  asset,
  history,
}: {
  canEdit: boolean;
  locale: string | null;
  currencyCode: string;
  asset: AssetDetail;
  history: AssetHistoryRow[];
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const { pending, run } = useServerAction();
  const money = (amount: string | number) => formatCurrency(amount, locale, currencyCode);
  const AssetTypeIcon = ASSET_TYPE_ICONS[asset.type];

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string>();
  const [updateValueOpen, setUpdateValueOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const chartHistory = [...history].reverse();

  function handleUpdateDetails(formData: FormData) {
    setEditError(undefined);
    run(
      () => updateAssetAction(asset.id, {}, formData),
      () => {
        setEditOpen(false);
        router.refresh();
      },
      (err) => setEditError(err),
    );
  }

  function handleRecordValue(formData: FormData) {
    setUpdateError(undefined);
    run(
      () => recordAssetValueAction(asset.id, {}, formData),
      () => {
        setUpdateValueOpen(false);
        showToast(t("netWorth.assetDetail.updateValueSuccessToast"), "success");
        router.refresh();
      },
      (err) => setUpdateError(err),
    );
  }

  function handleDelete() {
    run(
      () => deleteAssetAction(asset.id),
      () => {
        showToast(t("netWorth.assetDetail.deleteSuccessToast"), "success");
        router.push("/net-worth");
        router.refresh();
      },
      (err) => {
        setDeleteConfirmOpen(false);
        showToast(td(t, err), "error");
      },
    );
  }

  const stat = (label: string, value: string) => (
    <Box>
      <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 700 }} style={{ color: tokens.textBody }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: "14px", sm: "20px 26px" } }}>
      <Link
        href="/net-worth"
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
      >
        <ArrowBackIcon sx={{ fontSize: 16 }} style={{ color: tokens.textFaint }} />
        <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
          {t("netWorth.assetDetail.backLink")}
        </Typography>
      </Link>

      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          mt: "10px",
          mb: "18px",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
            style={{ color: tokens.textPrimary }}
          >
            {asset.name}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center", gap: "5px", mt: "2px" }}>
            {AssetTypeIcon && (
              <AssetTypeIcon sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }} />
            )}
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
              {assetTypeLabel(t, asset.type)}
            </Typography>
          </Stack>
        </Box>
        {canEdit && (
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            <AdminButton
              startIcon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
              onClick={() => setUpdateValueOpen(true)}
            >
              {t("netWorth.assetDetail.updateValueButton")}
            </AdminButton>
            <AdminButton
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => setEditOpen(true)}
            >
              {t("netWorth.assetDetail.editButton")}
            </AdminButton>
            <AdminButton
              danger
              disabled={pending}
              startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {t("common.delete")}
            </AdminButton>
          </Stack>
        )}
      </Stack>

      <Box
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "18px", mb: "20px" }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
          {t("netWorth.assetDetail.currentValueLabel")}
        </Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 700 }} style={{ color: tokens.cashPositive }}>
          {money(asset.value)}
        </Typography>

        <Stack direction="row" sx={{ gap: "28px", flexWrap: "wrap", mt: "16px" }}>
          {stat(t("netWorth.addAssetDialog.typeLabel"), assetTypeLabel(t, asset.type))}
          {stat(
            t("netWorth.addAssetDialog.purchaseDateLabel"),
            asset.purchaseDate
              ? formatDateOnly(asset.purchaseDate, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : t("netWorth.tbd"),
          )}
        </Stack>

        {asset.description && (
          <Typography
            sx={{
              fontSize: 12.5,
              mt: "14px",
              pt: "14px",
              borderTop: `1px solid ${tokens.divider}`,
            }}
            style={{ color: tokens.textBody }}
          >
            {asset.description}
          </Typography>
        )}
      </Box>

      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {t("netWorth.assetDetail.chartTitle")}
      </Typography>
      <Box
        sx={{
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          p: { xs: "8px", sm: "16px" },
          mb: "20px",
        }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        {chartHistory.length < 2 ? (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("netWorth.assetDetail.notEnoughHistoryForChart")}
          </Typography>
        ) : (
          <LineChart
            height={240}
            series={[
              {
                data: chartHistory.map((h) => Number(h.value)),
                label: t("netWorth.assetDetail.currentValueLabel"),
                color: tokens.cashPositive,
                showMark: chartHistory.length <= 24,
                area: true,
              },
            ]}
            xAxis={[
              {
                scaleType: "point",
                data: chartHistory.map((h) =>
                  formatDateOnly(h.date, { year: "numeric", month: "short", day: "numeric" }),
                ),
              },
            ]}
            margin={{ left: isMobile ? 36 : 70, right: isMobile ? 8 : 20 }}
          />
        )}
      </Box>

      <Typography
        sx={{ fontSize: 13, fontWeight: 600, mb: "10px" }}
        style={{ color: tokens.textBody }}
      >
        {t("netWorth.assetDetail.historyTitle")}
      </Typography>
      <Stack sx={{ gap: "8px" }}>
        {history.length === 0 && (
          <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
            {t("netWorth.assetDetail.noHistory")}
          </Typography>
        )}
        {history.map((row, i) => {
          const prev = history[i + 1];
          const delta = prev ? Number(row.value) - Number(prev.value) : null;
          return (
            <Stack
              key={row.id}
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                p: "11px 14px",
                borderRadius: "8px",
              }}
              style={{ border: `1px solid ${tokens.border}` }}
            >
              <Box>
                <Typography sx={{ fontSize: 13 }} style={{ color: tokens.textBody }}>
                  {formatDateOnly(row.date, { year: "numeric", month: "short", day: "numeric" })}
                </Typography>
                {row.description && (
                  <Typography
                    sx={{ fontSize: 11.5, mt: "2px" }}
                    style={{ color: tokens.textFaint }}
                  >
                    {row.description}
                  </Typography>
                )}
              </Box>
              <Stack sx={{ alignItems: "flex-end" }}>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 600 }}
                  style={{ color: tokens.textBody }}
                >
                  {money(row.value)}
                </Typography>
                {delta !== null && delta !== 0 && (
                  <Typography
                    sx={{ fontSize: 11 }}
                    style={{ color: delta > 0 ? tokens.green : tokens.red }}
                  >
                    {delta > 0 ? "+" : ""}
                    {money(delta)}
                  </Typography>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{t("netWorth.assetDetail.editButton")}</DialogTitle>
        <Stack component="form" action={handleUpdateDetails} key={editOpen ? "open" : "closed"}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("netWorth.addAssetDialog.nameLabel")} htmlFor="edit-asset-name">
                <TextField
                  id="edit-asset-name"
                  name="name"
                  defaultValue={asset.name}
                  fullWidth
                  size="small"
                />
              </Field>
              <Field label={t("netWorth.addAssetDialog.typeLabel")} htmlFor="edit-asset-type">
                <TextField
                  id="edit-asset-type"
                  name="type"
                  select
                  fullWidth
                  size="small"
                  defaultValue={asset.type}
                >
                  {Object.entries(ASSET_TYPE_LABEL_KEYS).map(([value, key]) => (
                    <MenuItem key={value} value={value}>
                      {td(t, key)}
                    </MenuItem>
                  ))}
                </TextField>
              </Field>
              <Field
                label={t("netWorth.addAssetDialog.purchaseDateLabel")}
                htmlFor="edit-asset-purchase-date"
              >
                <TextField
                  id="edit-asset-purchase-date"
                  name="purchaseDate"
                  type="date"
                  defaultValue={asset.purchaseDate ?? ""}
                  fullWidth
                  size="small"
                />
              </Field>
              <Field
                label={t("netWorth.addAssetDialog.descriptionLabel")}
                htmlFor="edit-asset-description"
              >
                <TextField
                  id="edit-asset-description"
                  name="description"
                  defaultValue={asset.description ?? ""}
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                />
              </Field>
              {editError && <Alert severity="error">{td(t, editError)}</Alert>}
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

      <Dialog
        open={updateValueOpen}
        onClose={() => setUpdateValueOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.assetDetail.updateValueButton")}
        </DialogTitle>
        <Stack
          component="form"
          action={handleRecordValue}
          key={updateValueOpen ? "open" : "closed"}
        >
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("netWorth.addAssetDialog.valueLabel")} htmlFor="value-value">
                <TextField
                  id="value-value"
                  name="value"
                  type="number"
                  autoFocus
                  fullWidth
                  defaultValue={asset.value}
                  slotProps={{ htmlInput: { step: "0.01" } }}
                />
              </Field>
              <Field label={t("netWorth.assetDetail.valueDateLabel")} htmlFor="value-date">
                <TextField
                  id="value-date"
                  name="date"
                  type="date"
                  fullWidth
                  size="small"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field
                label={t("netWorth.addAssetDialog.descriptionLabel")}
                htmlFor="value-description"
              >
                <TextField id="value-description" name="description" fullWidth size="small" />
              </Field>
              {updateError && <Alert severity="error">{td(t, updateError)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setUpdateValueOpen(false)} sx={{ color: "text.secondary" }}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={pending}>
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t("netWorth.assetDetail.deleteConfirmTitle")}
        description={t("netWorth.assetDetail.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}
