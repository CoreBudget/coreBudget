"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import type { PayPeriodType } from "@/generated/prisma/client";
import { computePaycheck, payPeriodsPerYear, resolveTaxRates } from "@/lib/paycheckCalc";
import PaycheckDialog, { type PaycheckDraft } from "./PaycheckDialog";
import type { QuickAddPaycheckContext } from "./actions";

function blankPrefill(): PaycheckDraft {
  const start = new Date();
  const end = new Date(start.getTime() + 14 * 86400000);
  return {
    periodStartDate: start.toISOString().slice(0, 10),
    periodEndDate: end.toISOString().slice(0, 10),
    grossIncome: "",
    incomeItems: [],
    withholdingItems: [],
    employerContributionItems: [],
    federalTaxAmount: "0",
    oasdiAmount: "0",
    medicareAmount: "0",
    stateTaxAmount: "0",
  };
}

function templatePrefill(
  template: QuickAddPaycheckContext["templatesByJobId"][string],
  payPeriodType: PayPeriodType,
  taxRates: QuickAddPaycheckContext["taxRates"],
): PaycheckDraft {
  const periodsPerYear = payPeriodsPerYear(payPeriodType);
  const result = computePaycheck({
    grossIncome: template.grossIncome,
    incomeItems: template.incomeItems,
    withholdingItems: template.withholdingItems,
    employerContributionItems: template.employerContributionItems,
    federalTaxAmount: template.federalTaxAmount,
    oasdiCalculationRule: template.oasdiCalculationRule,
    oasdiAmount: template.oasdiAmount,
    medicareCalculationRule: template.medicareCalculationRule,
    medicareAmount: template.medicareAmount,
    stateTaxCalculationRule: template.stateTaxCalculationRule,
    stateTaxAmount: template.stateTaxAmount,
    taxRates: resolveTaxRates(taxRates),
    periodsPerYear,
  });
  const start = new Date();
  const end = new Date(start.getTime() + (365 / periodsPerYear) * 86400000);
  return {
    periodStartDate: start.toISOString().slice(0, 10),
    periodEndDate: end.toISOString().slice(0, 10),
    grossIncome: String(template.grossIncome),
    incomeItems: template.incomeItems,
    withholdingItems: template.withholdingItems,
    employerContributionItems: template.employerContributionItems,
    federalTaxAmount: String(result.federalTaxAmount),
    oasdiAmount: result.oasdiAmount.toFixed(2),
    medicareAmount: result.medicareAmount.toFixed(2),
    stateTaxAmount: result.stateTaxAmount.toFixed(2),
  };
}

export default function AddPaycheckDialog({
  open,
  onClose,
  context,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  context: QuickAddPaycheckContext | null;
  loading: boolean;
}) {
  const t = useTranslations("incomeCalculator");
  const tRoot = useTranslations();
  const [selectedJobIdOverride, setSelectedJobIdOverride] = useState<string | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  const defaultJob = context ? (context.jobs.find((j) => j.isActive) ?? context.jobs[0]) : null;
  const selectedJobId = selectedJobIdOverride ?? defaultJob?.id ?? "";
  const selectedJob = context?.jobs.find((j) => j.id === selectedJobId);

  function handleClose() {
    setLogDialogOpen(false);
    setSelectedJobIdOverride(null);
    onClose();
  }

  if (logDialogOpen && context && selectedJob) {
    const template = context.templatesByJobId[selectedJob.id];
    const initial = template
      ? templatePrefill(template, selectedJob.payPeriodType, context.taxRates)
      : blankPrefill();

    return (
      <PaycheckDialog
        open
        onClose={handleClose}
        jobId={selectedJob.id}
        paycheckId={null}
        initial={initial}
        initialMode="edit"
        locale={context.locale}
      />
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t("logPaycheckTitle")}</DialogTitle>
      <DialogContent>
        {loading || !context ? (
          <Typography sx={{ fontSize: 13 }} color="text.secondary">
            {t("quickAddLoading")}
          </Typography>
        ) : context.jobs.length === 0 ? (
          <Box>
            <Typography sx={{ fontSize: 13, mb: 2 }} color="text.secondary">
              {t("noJobsSubtitle")}
            </Typography>
            <Link href="/settings/jobs" style={{ textDecoration: "none" }}>
              <Typography sx={{ fontSize: 13 }} color="primary.main">
                {t("manageJobsLink")}
              </Typography>
            </Link>
          </Box>
        ) : (
          <TextField
            select
            fullWidth
            label={t("quickAddJobLabel")}
            value={selectedJobId}
            onChange={(e) => setSelectedJobIdOverride(e.target.value)}
            sx={{ mt: 1 }}
          >
            {context.jobs.map((job) => (
              <MenuItem key={job.id} value={job.id}>
                {job.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ color: "text.secondary" }}>
          {tRoot("common.cancel")}
        </Button>
        {context && context.jobs.length > 0 && (
          <Button
            variant="contained"
            disabled={!selectedJobId}
            onClick={() => setLogDialogOpen(true)}
          >
            {t("quickAddContinueButton")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
