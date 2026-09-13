"use client";

import { useMemo, useState } from "react";
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
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { LineChart } from "@mui/x-charts/LineChart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PaymentIcon from "@mui/icons-material/Payment";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import Field from "../../../../_shared/Field";
import ConfirmDialog from "../../../../_shared/ConfirmDialog";
import CsvImportModal, { type CsvImportField } from "../../../../_shared/csvImport/CsvImportModal";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useIsMobile } from "../../../useIsMobile";
import { useTokens } from "@/theme";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import {
  buildAmortizationSchedule,
  computePayoffProjection,
  percentPaidOff,
} from "@/lib/liabilityPayoff";
import type { SidebarAccount } from "@/lib/workspace";
import { LIABILITY_TYPE_LABEL_KEYS, liabilityTypeLabel } from "../../netWorthTypeLabels";
import { LIABILITY_TYPE_ICONS } from "../../netWorthTypeIcons";
import {
  addEscrowDisbursementAction,
  deleteEscrowDisbursementAction,
  deleteLiabilityAction,
  deleteLiabilityPaymentAction,
  importLiabilityPaymentsAction,
  recordLiabilityPaymentAction,
  updateEscrowDisbursementAction,
  updateLiabilityAction,
  updateLiabilityBalanceAction,
  updateLiabilityPaymentAction,
} from "../../actions";

export interface LiabilityDetail {
  id: string;
  name: string;
  type: string;
  startingBalance: string;
  balance: string;
  interestPaidToDate: string;
  interestRate: string | null;
  minimumPayment: string | null;
  paymentDueDay: number | null;
  loanStartDate: string | null;
}

export interface LiabilityPaymentRow {
  id: string;
  date: string;
  paymentAmount: string;
  principal: string;
  interest: string;
  escrowAmount: string | null;
  endingBalance: string;
  accountId: string | null;
  notes: string | null;
}

export interface EscrowEntryRow {
  id: string;
  date: string;
  type: string;
  amount: string;
  runningBalance: string;
  description: string | null;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export default function LiabilityDetailView({
  canEdit,
  locale,
  currencyCode,
  cashAccounts,
  liability,
  payments,
  escrowEntries,
  initialRowsPerPage,
}: {
  canEdit: boolean;
  locale: string | null;
  currencyCode: string;
  cashAccounts: SidebarAccount[];
  liability: LiabilityDetail;
  payments: LiabilityPaymentRow[];
  escrowEntries: EscrowEntryRow[];
  initialRowsPerPage: number;
}) {
  const t = useTranslations();
  const tokens = useTokens();
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const router = useRouter();
  const { pending, run } = useServerAction();
  const money = (amount: string | number) => formatCurrency(amount, locale, currencyCode);
  const LiabilityTypeIcon = LIABILITY_TYPE_ICONS[liability.type];
  const isMortgage = liability.type === "mortgage";

  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string>();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const [paymentMode, setPaymentMode] = useState<"simple" | "breakdown">("simple");
  const [disbursementOpen, setDisbursementOpen] = useState(false);
  const [disbursementError, setDisbursementError] = useState<string>();
  const [showCompleted, setShowCompleted] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<LiabilityPaymentRow | null>(null);
  const [paymentEditError, setPaymentEditError] = useState<string>();
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [escrowPage, setEscrowPage] = useState(0);
  const [escrowRowsPerPage, setEscrowRowsPerPage] = useState(initialRowsPerPage);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentRowsPerPage, setPaymentRowsPerPage] = useState(initialRowsPerPage);
  const [amortPage, setAmortPage] = useState(0);
  const [amortRowsPerPage, setAmortRowsPerPage] = useState(initialRowsPerPage);
  const [editingDisbursement, setEditingDisbursement] = useState<EscrowEntryRow | null>(null);
  const [disbursementEditError, setDisbursementEditError] = useState<string>();
  const [deleteDisbursementId, setDeleteDisbursementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [updateBalanceOpen, setUpdateBalanceOpen] = useState(false);
  const [updateBalanceError, setUpdateBalanceError] = useState<string>();

  const balance = Number(liability.balance);
  const startingBalance = Number(liability.startingBalance);
  const interestRate = liability.interestRate ? Number(liability.interestRate) : null;
  const minimumPayment = liability.minimumPayment ? Number(liability.minimumPayment) : null;
  const pctPaid = percentPaidOff({ startingBalance, balance });
  const projection = useMemo(
    () => computePayoffProjection({ balance, interestRate, minimumPayment }),
    [balance, interestRate, minimumPayment],
  );
  const paymentDay = liability.paymentDueDay;
  const defaultPaymentAmount = minimumPayment ?? balance;
  const accountName = (id: string | null) =>
    id ? (cashAccounts.find((a) => a.id === id)?.name ?? null) : null;

  const importFields: CsvImportField[] = [
    { key: "date", label: t("netWorth.liabilityDetail.paymentDateLabel"), required: true },
    {
      key: "accountId",
      label: t("netWorth.liabilityDetail.paymentAccountLabel"),
      constantOptions: cashAccounts.map((a) => ({ value: a.id, label: a.name })),
    },
    { key: "paymentAmount", label: t("netWorth.liabilityDetail.paymentAmountLabel") },
    { key: "principal", label: t("netWorth.liabilityDetail.principalColumn") },
    { key: "interest", label: t("netWorth.liabilityDetail.interestColumn") },
    ...(isMortgage
      ? [{ key: "escrowAmount", label: t("netWorth.liabilityDetail.escrowAmountLabel") }]
      : []),
    { key: "notes", label: t("netWorth.liabilityDetail.notesLabel") },
  ];

  const schedule = useMemo(() => {
    if (!liability.loanStartDate) return [];
    return buildAmortizationSchedule({
      loanStartDate: liability.loanStartDate,
      startingBalance,
      interestRate,
      minimumPayment,
      payments: payments.map((p) => ({
        date: p.date,
        paymentAmount: Number(p.paymentAmount),
        principal: Number(p.principal),
        interest: Number(p.interest),
        endingBalance: Number(p.endingBalance),
      })),
    });
  }, [liability.loanStartDate, startingBalance, interestRate, minimumPayment, payments]);

  const today = new Date().toISOString().slice(0, 10);
  const completedRows = schedule.filter((r) => r.date <= today);
  const upcomingRows = schedule.filter((r) => r.date > today);
  const visibleScheduleRows = showCompleted ? schedule : upcomingRows;
  const amortPageRows = visibleScheduleRows.slice(
    amortPage * amortRowsPerPage,
    amortPage * amortRowsPerPage + amortRowsPerPage,
  );

  const tabKeys = useMemo(
    () => ["amortization", ...(isMortgage ? ["escrow"] : []), "paymentHistory"],
    [isMortgage],
  );
  const safeTab = Math.min(activeTab, tabKeys.length - 1);
  const activeTabKey = tabKeys[safeTab];

  const escrowBalance =
    escrowEntries.length > 0 ? Number(escrowEntries[escrowEntries.length - 1].runningBalance) : 0;

  const escrowSorted = useMemo(() => [...escrowEntries].reverse(), [escrowEntries]);
  const escrowPageRows = escrowSorted.slice(
    escrowPage * escrowRowsPerPage,
    escrowPage * escrowRowsPerPage + escrowRowsPerPage,
  );

  const paymentsSorted = useMemo(() => [...payments].reverse(), [payments]);
  const paymentPageRows = paymentsSorted.slice(
    paymentPage * paymentRowsPerPage,
    paymentPage * paymentRowsPerPage + paymentRowsPerPage,
  );

  function handleUpdateDetails(formData: FormData) {
    setEditError(undefined);
    run(
      () => updateLiabilityAction(liability.id, {}, formData),
      () => {
        setEditOpen(false);
        router.refresh();
      },
      (err) => setEditError(err),
    );
  }

  function handleRecordPayment(formData: FormData) {
    setPaymentError(undefined);
    run(
      () => recordLiabilityPaymentAction(liability.id, {}, formData),
      () => {
        setPaymentOpen(false);
        showToast(t("netWorth.liabilityDetail.paymentSuccessToast"), "success");
        router.refresh();
      },
      (err) => setPaymentError(err),
    );
  }

  function handleAddDisbursement(formData: FormData) {
    setDisbursementError(undefined);
    run(
      () => addEscrowDisbursementAction(liability.id, {}, formData),
      () => {
        setDisbursementOpen(false);
        router.refresh();
      },
      (err) => setDisbursementError(err),
    );
  }

  function openEditDisbursement(e: EscrowEntryRow) {
    setDisbursementEditError(undefined);
    setEditingDisbursement(e);
  }

  function handleUpdateDisbursement(formData: FormData) {
    if (!editingDisbursement) return;
    setDisbursementEditError(undefined);
    run(
      () => updateEscrowDisbursementAction(editingDisbursement.id, {}, formData),
      () => {
        setEditingDisbursement(null);
        showToast(t("netWorth.liabilityDetail.disbursementUpdatedToast"), "success");
        router.refresh();
      },
      (err) => setDisbursementEditError(err),
    );
  }

  function handleDeleteDisbursement() {
    if (!deleteDisbursementId) return;
    run(
      () => deleteEscrowDisbursementAction(deleteDisbursementId),
      () => {
        setDeleteDisbursementId(null);
        showToast(t("netWorth.liabilityDetail.disbursementDeletedToast"), "success");
        router.refresh();
      },
      (err) => {
        setDeleteDisbursementId(null);
        showToast(td(t, err), "error");
      },
    );
  }

  function handleUpdateBalance(formData: FormData) {
    setUpdateBalanceError(undefined);
    run(
      () => updateLiabilityBalanceAction(liability.id, {}, formData),
      () => {
        setUpdateBalanceOpen(false);
        showToast(t("netWorth.liabilityDetail.updateBalanceSuccessToast"), "success");
        router.refresh();
      },
      (err) => setUpdateBalanceError(err),
    );
  }

  function openEditPayment(p: LiabilityPaymentRow) {
    setPaymentEditError(undefined);
    setEditingPayment(p);
  }

  function handleUpdatePayment(formData: FormData) {
    if (!editingPayment) return;
    setPaymentEditError(undefined);
    run(
      () => updateLiabilityPaymentAction(editingPayment.id, {}, formData),
      () => {
        setEditingPayment(null);
        showToast(t("netWorth.liabilityDetail.paymentUpdatedToast"), "success");
        router.refresh();
      },
      (err) => setPaymentEditError(err),
    );
  }

  function handleDeletePayment() {
    if (!deletePaymentId) return;
    run(
      () => deleteLiabilityPaymentAction(deletePaymentId),
      () => {
        setDeletePaymentId(null);
        showToast(t("netWorth.liabilityDetail.paymentDeletedToast"), "success");
        router.refresh();
      },
      (err) => {
        setDeletePaymentId(null);
        showToast(td(t, err), "error");
      },
    );
  }

  function handleDelete() {
    run(
      () => deleteLiabilityAction(liability.id),
      () => {
        showToast(t("netWorth.liabilityDetail.deleteSuccessToast"), "success");
        router.push("/net-worth");
        router.refresh();
      },
      (err) => {
        setDeleteConfirmOpen(false);
        showToast(td(t, err), "error");
      },
    );
  }

  const stat = (label: string, value: string, color?: string) => (
    <Box>
      <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
        {label}
      </Typography>
      <Typography
        sx={{ fontSize: 15, fontWeight: 700 }}
        style={{ color: color ?? tokens.textBody }}
      >
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
          {t("netWorth.liabilityDetail.backLink")}
        </Typography>
      </Link>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "flex-start" },
          mt: "10px",
          mb: "14px",
          gap: 1,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{ fontSize: 20, fontWeight: 700, m: 0 }}
            style={{ color: tokens.textPrimary }}
          >
            {liability.name}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center", gap: "5px", mt: "2px" }}>
            {LiabilityTypeIcon && (
              <LiabilityTypeIcon sx={{ fontSize: 13 }} style={{ color: tokens.textFaint }} />
            )}
            <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
              {liabilityTypeLabel(t, liability.type)}
            </Typography>
          </Stack>
        </Box>
        {canEdit && (
          <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <AdminButton
              variant="contained"
              startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
              onClick={() => setPaymentOpen(true)}
            >
              {t("netWorth.liabilityDetail.recordPaymentButton")}
            </AdminButton>
            <AdminButton
              startIcon={<UploadFileIcon sx={{ fontSize: 14 }} />}
              onClick={() => setImportOpen(true)}
            >
              {t("netWorth.liabilityDetail.importCsvButton")}
            </AdminButton>
            <AdminButton
              startIcon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
              onClick={() => setUpdateBalanceOpen(true)}
            >
              {t("netWorth.liabilityDetail.updateBalanceButton")}
            </AdminButton>
            <AdminButton
              startIcon={<EditIcon sx={{ fontSize: 14 }} />}
              onClick={() => setEditOpen(true)}
            >
              {t("netWorth.liabilityDetail.editButton")}
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
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", p: "18px", mb: "16px" }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Stack direction="row" sx={{ gap: "28px", flexWrap: "wrap" }}>
          {stat(
            t("netWorth.liabilityDetail.startingBalanceLabel"),
            money(liability.startingBalance),
          )}
          {stat(
            t("netWorth.liabilityDetail.currentBalanceLabel"),
            money(liability.balance),
            tokens.red,
          )}
          {stat(
            t("netWorth.liabilityDetail.percentPaidOffLabel"),
            `${Math.round(pctPaid * 100)}%`,
            tokens.green,
          )}
          {stat(
            t("netWorth.liabilityDetail.interestPaidLabel"),
            money(liability.interestPaidToDate),
          )}
          {stat(
            t("netWorth.liabilityDetail.interestRateLabel"),
            interestRate != null ? `${interestRate}%` : t("netWorth.tbd"),
          )}
          {stat(
            t("netWorth.liabilityDetail.minimumPaymentLabel"),
            minimumPayment != null ? money(minimumPayment) : t("netWorth.tbd"),
          )}
          {stat(
            t("netWorth.liabilityDetail.paymentDayLabel"),
            paymentDay != null ? ordinal(paymentDay) : t("netWorth.tbd"),
          )}
          {stat(
            t("netWorth.liabilityDetail.payoffDateLabel"),
            projection
              ? formatDateOnly(projection.payoffDate, { year: "numeric", month: "short" })
              : t("netWorth.liabilityDetail.noProjection"),
          )}
        </Stack>

        <Box sx={{ mt: "16px" }}>
          <LinearProgress
            variant="determinate"
            value={pctPaid * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Box>

      <Box
        sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px" }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Tabs
          value={safeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: "8px", minHeight: 42 }}
          style={{ borderBottom: `1px solid ${tokens.border}` }}
        >
          <Tab sx={{ minHeight: 42 }} label={t("netWorth.liabilityDetail.amortizationTitle")} />
          {isMortgage && (
            <Tab sx={{ minHeight: 42 }} label={t("netWorth.liabilityDetail.escrowTitle")} />
          )}
          <Tab sx={{ minHeight: 42 }} label={t("netWorth.liabilityDetail.historyTitle")} />
        </Tabs>

        <Box sx={{ p: { xs: "8px", sm: "16px" } }}>
          {activeTabKey === "amortization" && (
            <>
              <Alert severity="info" sx={{ mb: "14px" }}>
                {t("netWorth.liabilityDetail.disclaimer")}
              </Alert>
              <Stack
                direction="row"
                sx={{ justifyContent: "flex-end", alignItems: "center", mb: "10px" }}
              >
                {completedRows.length > 0 && (
                  <AdminButton
                    onClick={() => {
                      setShowCompleted((s) => !s);
                      setAmortPage(0);
                    }}
                  >
                    {showCompleted ? (
                      <ExpandMoreIcon sx={{ fontSize: 15, mr: "2px" }} />
                    ) : (
                      <ChevronRightIcon sx={{ fontSize: 15, mr: "2px" }} />
                    )}
                    {t("netWorth.liabilityDetail.showCompleted", { count: completedRows.length })}
                  </AdminButton>
                )}
              </Stack>

              {schedule.length === 0 ? (
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                  {liability.loanStartDate
                    ? t("netWorth.liabilityDetail.noSchedule")
                    : t("netWorth.liabilityDetail.noLoanStartDate")}
                </Typography>
              ) : (
                <>
                  <LineChart
                    height={240}
                    series={[
                      {
                        data: schedule.map((r) => r.endingBalance),
                        label: t("netWorth.liabilityDetail.currentBalanceLabel"),
                        color: tokens.red,
                        showMark: false,
                        area: true,
                      },
                    ]}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: schedule.map((r) =>
                          formatDateOnly(r.date, { year: "numeric", month: "short" }),
                        ),
                        tickLabelInterval: (_, i) => i % 12 === 0,
                      },
                    ]}
                    margin={{ left: isMobile ? 36 : 70, right: isMobile ? 8 : 20 }}
                    sx={{ mb: "12px" }}
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 500 }}>
                    <Box sx={{ flex: 1, overflow: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>{t("netWorth.liabilityDetail.monthColumn")}</TableCell>
                            <TableCell>{t("netWorth.liabilityDetail.dateColumn")}</TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.paymentColumn")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.principalColumn")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.interestColumn")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.endingBalanceColumn")}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {amortPageRows.map((r) => (
                            <TableRow
                              key={r.month}
                              style={{
                                backgroundColor: r.actual ? `${tokens.green}14` : "transparent",
                              }}
                            >
                              <TableCell
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.textFaint }}
                              >
                                {r.month}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12.5 }}>
                                {formatDateOnly(r.date, { year: "numeric", month: "short" })}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12.5 }}>
                                {money(r.payment)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.green }}
                              >
                                {money(r.principal)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.red }}
                              >
                                {money(r.interest)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600 }}>
                                {money(r.endingBalance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    <TablePagination
                      component="div"
                      count={visibleScheduleRows.length}
                      page={amortPage}
                      onPageChange={(_, p) => setAmortPage(p)}
                      rowsPerPage={amortRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setAmortRowsPerPage(Number(e.target.value));
                        setAmortPage(0);
                      }}
                      rowsPerPageOptions={[5, 10, 25]}
                    />
                  </Box>
                </>
              )}
            </>
          )}

          {activeTabKey === "escrow" && (
            <>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center", mb: "10px" }}
              >
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: escrowBalance < 0 ? 600 : 400 }}
                  style={{ color: escrowBalance < 0 ? tokens.red : tokens.textFaint }}
                >
                  {t("netWorth.liabilityDetail.escrowBalanceLabel")}: {money(escrowBalance)}
                </Typography>
                {canEdit && (
                  <AdminButton
                    startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setDisbursementOpen(true)}
                  >
                    {t("netWorth.liabilityDetail.addDisbursementButton")}
                  </AdminButton>
                )}
              </Stack>
              {escrowEntries.length === 0 ? (
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                  {t("netWorth.liabilityDetail.noEscrowHistory")}
                </Typography>
              ) : (
                <>
                  <LineChart
                    height={240}
                    series={[
                      {
                        data: escrowEntries.map((e) => Number(e.runningBalance)),
                        label: t("netWorth.liabilityDetail.escrowBalanceLabel"),
                        color: tokens.blue,
                        showMark: escrowEntries.length <= 30,
                        area: true,
                      },
                    ]}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: escrowEntries.map((e) =>
                          formatDateOnly(e.date, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }),
                        ),
                        tickLabelInterval: (_, i) =>
                          escrowEntries.length <= 12 ||
                          i % Math.ceil(escrowEntries.length / 12) === 0,
                      },
                    ]}
                    margin={{ left: isMobile ? 36 : 70, right: isMobile ? 8 : 20 }}
                    sx={{ mb: "12px" }}
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 500 }}>
                    <Box sx={{ flex: 1, overflow: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>{t("netWorth.liabilityDetail.dateColumn")}</TableCell>
                            <TableCell>{t("netWorth.liabilityDetail.escrowTypeColumn")}</TableCell>
                            <TableCell>{t("netWorth.addAssetDialog.descriptionLabel")}</TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.paymentAmountLabel")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.escrowBalanceLabel")}
                            </TableCell>
                            {canEdit && <TableCell align="right" />}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {escrowPageRows.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell sx={{ fontSize: 12.5 }}>
                                {formatDateOnly(e.date, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </TableCell>
                              <TableCell sx={{ fontSize: 12.5 }}>
                                {e.type === "deposit"
                                  ? t("netWorth.liabilityDetail.escrowDeposit")
                                  : t("netWorth.liabilityDetail.escrowDisbursement")}
                              </TableCell>
                              <TableCell
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.textFaint }}
                              >
                                {e.description ?? ""}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: 12.5, fontWeight: 600 }}
                                style={{ color: e.type === "deposit" ? tokens.green : tokens.red }}
                              >
                                {e.type === "deposit" ? "+" : "-"}
                                {money(e.amount)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12.5 }}>
                                {money(e.runningBalance)}
                              </TableCell>
                              {canEdit && (
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                  {e.type === "disbursement" && (
                                    <>
                                      <IconButton
                                        size="small"
                                        onClick={() => openEditDisbursement(e)}
                                        aria-label={td(t, "common.edit")}
                                      >
                                        <EditIcon
                                          sx={{ fontSize: 15 }}
                                          style={{ color: tokens.textFaint }}
                                        />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => setDeleteDisbursementId(e.id)}
                                        aria-label={td(t, "common.delete")}
                                      >
                                        <DeleteOutlineIcon
                                          sx={{ fontSize: 15 }}
                                          style={{ color: tokens.red }}
                                        />
                                      </IconButton>
                                    </>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    <TablePagination
                      component="div"
                      count={escrowSorted.length}
                      page={escrowPage}
                      onPageChange={(_, p) => setEscrowPage(p)}
                      rowsPerPage={escrowRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setEscrowRowsPerPage(Number(e.target.value));
                        setEscrowPage(0);
                      }}
                      rowsPerPageOptions={[5, 10, 25]}
                    />
                  </Box>
                </>
              )}
            </>
          )}

          {activeTabKey === "paymentHistory" && (
            <>
              <Typography sx={{ fontSize: 12, mb: "10px" }} style={{ color: tokens.textFaint }}>
                {t("netWorth.liabilityDetail.paymentCount", { count: payments.length })}
              </Typography>
              {payments.length === 0 ? (
                <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                  {t("netWorth.liabilityDetail.noHistory")}
                </Typography>
              ) : (
                <>
                  <LineChart
                    height={240}
                    series={[
                      {
                        data: payments.map((p) => Number(p.principal)),
                        label: t("netWorth.liabilityDetail.principalColumn"),
                        color: tokens.green,
                        showMark: payments.length <= 30,
                      },
                      {
                        data: payments.map((p) => Number(p.interest)),
                        label: t("netWorth.liabilityDetail.interestColumn"),
                        color: tokens.red,
                        showMark: payments.length <= 30,
                      },
                      ...(isMortgage
                        ? [
                            {
                              data: payments.map((p) => Number(p.escrowAmount ?? 0)),
                              label: t("netWorth.liabilityDetail.escrowAmountLabel"),
                              color: tokens.blue,
                              showMark: payments.length <= 30,
                            },
                          ]
                        : []),
                    ]}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: payments.map((p) =>
                          formatDateOnly(p.date, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }),
                        ),
                        tickLabelInterval: (_, i) =>
                          payments.length <= 12 || i % Math.ceil(payments.length / 12) === 0,
                      },
                    ]}
                    margin={{ left: isMobile ? 36 : 70, right: isMobile ? 8 : 20 }}
                    sx={{ mb: "12px" }}
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", maxHeight: 500 }}>
                    <Box sx={{ flex: 1, overflow: "auto" }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>{t("netWorth.liabilityDetail.dateColumn")}</TableCell>
                            <TableCell>
                              {t("netWorth.liabilityDetail.paymentAccountLabel")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.paymentColumn")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.principalColumn")}
                            </TableCell>
                            <TableCell align="right">
                              {t("netWorth.liabilityDetail.interestColumn")}
                            </TableCell>
                            {isMortgage && (
                              <TableCell align="right">
                                {t("netWorth.liabilityDetail.escrowAmountLabel")}
                              </TableCell>
                            )}
                            <TableCell>{t("netWorth.liabilityDetail.notesLabel")}</TableCell>
                            {canEdit && <TableCell align="right" />}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paymentPageRows.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell sx={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                                {formatDateOnly(p.date, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </TableCell>
                              <TableCell
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.textFaint }}
                              >
                                {accountName(p.accountId) ?? ""}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600 }}>
                                {money(p.paymentAmount)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.green }}
                              >
                                {money(p.principal)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.red }}
                              >
                                {money(p.interest)}
                              </TableCell>
                              {isMortgage && (
                                <TableCell align="right" sx={{ fontSize: 12.5 }}>
                                  {p.escrowAmount ? money(p.escrowAmount) : ""}
                                </TableCell>
                              )}
                              <TableCell
                                sx={{ fontSize: 12.5 }}
                                style={{ color: tokens.textFaint }}
                              >
                                {p.notes ?? ""}
                              </TableCell>
                              {canEdit && (
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => openEditPayment(p)}
                                    aria-label={td(t, "common.edit")}
                                  >
                                    <EditIcon
                                      sx={{ fontSize: 15 }}
                                      style={{ color: tokens.textFaint }}
                                    />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeletePaymentId(p.id)}
                                    aria-label={td(t, "common.delete")}
                                  >
                                    <DeleteOutlineIcon
                                      sx={{ fontSize: 15 }}
                                      style={{ color: tokens.red }}
                                    />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    <TablePagination
                      component="div"
                      count={paymentsSorted.length}
                      page={paymentPage}
                      onPageChange={(_, p) => setPaymentPage(p)}
                      rowsPerPage={paymentRowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setPaymentRowsPerPage(Number(e.target.value));
                        setPaymentPage(0);
                      }}
                      rowsPerPageOptions={[5, 10, 25]}
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </Box>
      </Box>

      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.liabilityDetail.recordPaymentButton")}
        </DialogTitle>
        <Stack component="form" action={handleRecordPayment} key={paymentOpen ? "open" : "closed"}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field label={t("netWorth.liabilityDetail.paymentDateLabel")} htmlFor="payment-date">
                <TextField
                  id="payment-date"
                  name="date"
                  type="date"
                  fullWidth
                  size="small"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field
                label={t("netWorth.liabilityDetail.paymentAccountLabel")}
                htmlFor="payment-account"
              >
                <TextField
                  id="payment-account"
                  name="accountId"
                  select
                  fullWidth
                  size="small"
                  defaultValue=""
                >
                  <MenuItem value="">{t("netWorth.liabilityDetail.noAccountOption")}</MenuItem>
                  {cashAccounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Field>

              <Stack direction="row" sx={{ gap: 1 }}>
                <AdminButton
                  variant={paymentMode === "simple" ? "contained" : "outlined"}
                  onClick={() => setPaymentMode("simple")}
                >
                  {t("netWorth.liabilityDetail.simpleModeButton")}
                </AdminButton>
                <AdminButton
                  variant={paymentMode === "breakdown" ? "contained" : "outlined"}
                  onClick={() => setPaymentMode("breakdown")}
                >
                  {t("netWorth.liabilityDetail.breakdownModeButton")}
                </AdminButton>
              </Stack>

              {paymentMode === "simple" ? (
                <Field
                  label={t("netWorth.liabilityDetail.paymentAmountLabel")}
                  htmlFor="payment-amount"
                >
                  <TextField
                    id="payment-amount"
                    name="paymentAmount"
                    type="number"
                    fullWidth
                    defaultValue={defaultPaymentAmount}
                    slotProps={{ htmlInput: { step: "0.01" } }}
                  />
                </Field>
              ) : (
                <>
                  <Field
                    label={t("netWorth.liabilityDetail.principalColumn")}
                    htmlFor="payment-principal"
                  >
                    <TextField
                      id="payment-principal"
                      name="principal"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ htmlInput: { step: "0.01" } }}
                    />
                  </Field>
                  <Field
                    label={t("netWorth.liabilityDetail.interestColumn")}
                    htmlFor="payment-interest"
                  >
                    <TextField
                      id="payment-interest"
                      name="interest"
                      type="number"
                      fullWidth
                      size="small"
                      slotProps={{ htmlInput: { step: "0.01" } }}
                    />
                  </Field>
                </>
              )}

              {isMortgage && (
                <Field
                  label={t("netWorth.liabilityDetail.escrowAmountLabel")}
                  htmlFor="payment-escrow"
                >
                  <TextField
                    id="payment-escrow"
                    name="escrowAmount"
                    type="number"
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { step: "0.01" } }}
                  />
                </Field>
              )}

              <Field label={t("netWorth.liabilityDetail.notesLabel")} htmlFor="payment-notes">
                <TextField id="payment-notes" name="notes" fullWidth size="small" />
              </Field>

              {paymentError && <Alert severity="error">{td(t, paymentError)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setPaymentOpen(false)}
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{ color: "text.secondary" }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
            >
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <Dialog
        open={disbursementOpen}
        onClose={() => setDisbursementOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.liabilityDetail.addDisbursementButton")}
        </DialogTitle>
        <Stack
          component="form"
          action={handleAddDisbursement}
          key={disbursementOpen ? "open" : "closed"}
        >
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field
                label={t("netWorth.liabilityDetail.paymentDateLabel")}
                htmlFor="disbursement-date"
              >
                <TextField
                  id="disbursement-date"
                  name="date"
                  type="date"
                  fullWidth
                  size="small"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field
                label={t("netWorth.liabilityDetail.paymentAmountLabel")}
                htmlFor="disbursement-amount"
              >
                <TextField
                  id="disbursement-amount"
                  name="amount"
                  type="number"
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                />
              </Field>
              <Field
                label={t("netWorth.addAssetDialog.descriptionLabel")}
                htmlFor="disbursement-description"
              >
                <TextField
                  id="disbursement-description"
                  name="description"
                  fullWidth
                  size="small"
                />
              </Field>
              {disbursementError && <Alert severity="error">{td(t, disbursementError)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDisbursementOpen(false)}
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{ color: "text.secondary" }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
            >
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <Dialog
        open={!!editingDisbursement}
        onClose={() => setEditingDisbursement(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.liabilityDetail.editDisbursementTitle")}
        </DialogTitle>
        {editingDisbursement && (
          <Stack component="form" action={handleUpdateDisbursement} key={editingDisbursement.id}>
            <DialogContent>
              <Stack sx={{ gap: 2 }}>
                <Field
                  label={t("netWorth.liabilityDetail.paymentDateLabel")}
                  htmlFor="edit-disbursement-date"
                >
                  <TextField
                    id="edit-disbursement-date"
                    name="date"
                    type="date"
                    fullWidth
                    size="small"
                    defaultValue={editingDisbursement.date}
                  />
                </Field>
                <Field
                  label={t("netWorth.liabilityDetail.paymentAmountLabel")}
                  htmlFor="edit-disbursement-amount"
                >
                  <TextField
                    id="edit-disbursement-amount"
                    name="amount"
                    type="number"
                    fullWidth
                    size="small"
                    defaultValue={editingDisbursement.amount}
                    slotProps={{ htmlInput: { step: "0.01" } }}
                  />
                </Field>
                <Field
                  label={t("netWorth.addAssetDialog.descriptionLabel")}
                  htmlFor="edit-disbursement-description"
                >
                  <TextField
                    id="edit-disbursement-description"
                    name="description"
                    fullWidth
                    size="small"
                    defaultValue={editingDisbursement.description ?? ""}
                  />
                </Field>
                {disbursementEditError && (
                  <Alert severity="error">{td(t, disbursementEditError)}</Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setEditingDisbursement(null)}
                startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                sx={{ color: "text.secondary" }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={pending}
                startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
              >
                {t("common.save")}
              </Button>
            </DialogActions>
          </Stack>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteDisbursementId}
        title={t("netWorth.liabilityDetail.deleteDisbursementConfirmTitle")}
        description={t("netWorth.liabilityDetail.deleteDisbursementConfirmDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onCancel={() => setDeleteDisbursementId(null)}
        onConfirm={handleDeleteDisbursement}
      />

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.liabilityDetail.editButton")}
        </DialogTitle>
        <Stack component="form" action={handleUpdateDetails} key={editOpen ? "open" : "closed"}>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Field
                label={t("netWorth.addLiabilityDialog.nameLabel")}
                htmlFor="edit-liability-name"
              >
                <TextField
                  id="edit-liability-name"
                  name="name"
                  defaultValue={liability.name}
                  fullWidth
                  size="small"
                />
              </Field>
              <Field
                label={t("netWorth.addLiabilityDialog.typeLabel")}
                htmlFor="edit-liability-type"
              >
                <TextField
                  id="edit-liability-type"
                  name="type"
                  select
                  fullWidth
                  size="small"
                  defaultValue={liability.type}
                >
                  {Object.entries(LIABILITY_TYPE_LABEL_KEYS).map(([value, key]) => (
                    <MenuItem key={value} value={value}>
                      {td(t, key)}
                    </MenuItem>
                  ))}
                </TextField>
              </Field>
              <Field
                label={t("netWorth.addLiabilityDialog.interestRateLabel")}
                htmlFor="edit-liability-interest-rate"
              >
                <TextField
                  id="edit-liability-interest-rate"
                  name="interestRate"
                  type="number"
                  defaultValue={liability.interestRate ?? ""}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { step: "0.0001" } }}
                />
              </Field>
              <Field
                label={t("netWorth.addLiabilityDialog.minimumPaymentLabel")}
                htmlFor="edit-liability-minimum-payment"
              >
                <TextField
                  id="edit-liability-minimum-payment"
                  name="minimumPayment"
                  type="number"
                  defaultValue={liability.minimumPayment ?? ""}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                />
              </Field>
              <Field
                label={t("netWorth.addLiabilityDialog.paymentDueDayLabel")}
                htmlFor="edit-liability-payment-due-day"
              >
                <TextField
                  id="edit-liability-payment-due-day"
                  name="paymentDueDay"
                  type="number"
                  defaultValue={liability.paymentDueDay ?? ""}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { min: 1, max: 31, step: 1 } }}
                />
              </Field>
              <Field
                label={t("netWorth.addLiabilityDialog.loanStartDateLabel")}
                htmlFor="edit-liability-loan-start-date"
              >
                <TextField
                  id="edit-liability-loan-start-date"
                  name="loanStartDate"
                  type="date"
                  defaultValue={liability.loanStartDate ?? ""}
                  fullWidth
                  size="small"
                />
              </Field>
              {editError && <Alert severity="error">{td(t, editError)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setEditOpen(false)}
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{ color: "text.secondary" }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
            >
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <Dialog
        open={updateBalanceOpen}
        onClose={() => setUpdateBalanceOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.liabilityDetail.updateBalanceButton")}
        </DialogTitle>
        <Stack
          component="form"
          action={handleUpdateBalance}
          key={updateBalanceOpen ? "open" : "closed"}
        >
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <Typography sx={{ fontSize: 12.5 }} style={{ color: tokens.textFaint }}>
                {t("netWorth.liabilityDetail.updateBalanceHint")}
              </Typography>
              <Field
                label={t("netWorth.liabilityDetail.paymentDateLabel")}
                htmlFor="update-balance-date"
              >
                <TextField
                  id="update-balance-date"
                  name="date"
                  type="date"
                  fullWidth
                  size="small"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </Field>
              <Field
                label={t("netWorth.liabilityDetail.currentBalanceLabel")}
                htmlFor="update-balance-balance"
              >
                <TextField
                  id="update-balance-balance"
                  name="balance"
                  type="number"
                  fullWidth
                  defaultValue={liability.balance}
                  slotProps={{ htmlInput: { step: "0.01" } }}
                />
              </Field>
              <Field
                label={t("netWorth.liabilityDetail.interestPaidLabel")}
                htmlFor="update-balance-interest"
              >
                <TextField
                  id="update-balance-interest"
                  name="interestPaidToDate"
                  type="number"
                  fullWidth
                  size="small"
                  defaultValue={liability.interestPaidToDate}
                  slotProps={{ htmlInput: { step: "0.01" } }}
                />
              </Field>
              {updateBalanceError && <Alert severity="error">{td(t, updateBalanceError)}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setUpdateBalanceOpen(false)}
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              sx={{ color: "text.secondary" }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
            >
              {t("common.save")}
            </Button>
          </DialogActions>
        </Stack>
      </Dialog>

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={t("netWorth.liabilityDetail.importCsvButton")}
        fields={importFields}
        onImport={async (rows) => {
          const result = await importLiabilityPaymentsAction(liability.id, rows);
          if (!result.error) router.refresh();
          return result;
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t("netWorth.liabilityDetail.deleteConfirmTitle")}
        description={t("netWorth.liabilityDetail.deleteConfirmDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      <Dialog
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t("netWorth.liabilityDetail.editPaymentTitle")}
        </DialogTitle>
        {editingPayment && (
          <Stack component="form" action={handleUpdatePayment} key={editingPayment.id}>
            <DialogContent>
              <Stack sx={{ gap: 2 }}>
                <Field
                  label={t("netWorth.liabilityDetail.paymentDateLabel")}
                  htmlFor="edit-payment-date"
                >
                  <TextField
                    id="edit-payment-date"
                    name="date"
                    type="date"
                    fullWidth
                    size="small"
                    defaultValue={editingPayment.date}
                  />
                </Field>
                <Field
                  label={t("netWorth.liabilityDetail.paymentAccountLabel")}
                  htmlFor="edit-payment-account"
                >
                  <TextField
                    id="edit-payment-account"
                    name="accountId"
                    select
                    fullWidth
                    size="small"
                    defaultValue={editingPayment.accountId ?? ""}
                  >
                    <MenuItem value="">{t("netWorth.liabilityDetail.noAccountOption")}</MenuItem>
                    {cashAccounts.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Field>
                <Field
                  label={t("netWorth.liabilityDetail.principalColumn")}
                  htmlFor="edit-payment-principal"
                >
                  <TextField
                    id="edit-payment-principal"
                    name="principal"
                    type="number"
                    fullWidth
                    size="small"
                    defaultValue={editingPayment.principal}
                    slotProps={{ htmlInput: { step: "0.01" } }}
                  />
                </Field>
                <Field
                  label={t("netWorth.liabilityDetail.interestColumn")}
                  htmlFor="edit-payment-interest"
                >
                  <TextField
                    id="edit-payment-interest"
                    name="interest"
                    type="number"
                    fullWidth
                    size="small"
                    defaultValue={editingPayment.interest}
                    slotProps={{ htmlInput: { step: "0.01" } }}
                  />
                </Field>
                {isMortgage && (
                  <Field
                    label={t("netWorth.liabilityDetail.escrowAmountLabel")}
                    htmlFor="edit-payment-escrow"
                  >
                    <TextField
                      id="edit-payment-escrow"
                      name="escrowAmount"
                      type="number"
                      fullWidth
                      size="small"
                      defaultValue={editingPayment.escrowAmount ?? ""}
                      slotProps={{ htmlInput: { step: "0.01" } }}
                    />
                  </Field>
                )}
                <Field
                  label={t("netWorth.liabilityDetail.notesLabel")}
                  htmlFor="edit-payment-notes"
                >
                  <TextField
                    id="edit-payment-notes"
                    name="notes"
                    fullWidth
                    size="small"
                    defaultValue={editingPayment.notes ?? ""}
                  />
                </Field>
                {paymentEditError && <Alert severity="error">{td(t, paymentEditError)}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setEditingPayment(null)}
                startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                sx={{ color: "text.secondary" }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={pending}
                startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
              >
                {t("common.save")}
              </Button>
            </DialogActions>
          </Stack>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deletePaymentId}
        title={t("netWorth.liabilityDetail.deletePaymentConfirmTitle")}
        description={t("netWorth.liabilityDetail.deletePaymentConfirmDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        onCancel={() => setDeletePaymentId(null)}
        onConfirm={handleDeletePayment}
      />
    </Box>
  );
}
