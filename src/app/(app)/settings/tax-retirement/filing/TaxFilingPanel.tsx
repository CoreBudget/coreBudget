"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import SectionHeader from "../../../../admin/_shared/SectionHeader";
import AdminButton from "../../../../admin/_shared/AdminButton";
import { useTokens } from "@/theme";
import { useToast } from "../../../../_shared/ToastProvider";
import { useServerAction } from "../../../../_shared/useServerAction";
import { td } from "@/lib/i18n/translateDynamicKey";
import { FILING_STATUS_OPTIONS } from "../constants";
import { updateTaxFilingAction } from "../actions";

const FILING_STATUS_LABEL_KEYS: Record<string, string> = {
  single: "settings.taxRetirement.filing.filingStatuses.single",
  married_filing_jointly: "settings.taxRetirement.filing.filingStatuses.marriedJointly",
  married_filing_separately: "settings.taxRetirement.filing.filingStatuses.marriedSeparately",
  head_of_household: "settings.taxRetirement.filing.filingStatuses.headOfHousehold",
};

export default function TaxFilingPanel(props: {
  fillingType: string;
  stateTaxRate: string;
  socialSecurityRate: string;
  medicareRate: string;
  fourZeroOneKContributionRate: string;
  fourZeroOneKMatchRate: string;
  fourZeroOneKMaxContributionRate: string;
  standardDeduction: string;
  childDependencyCredit: string;
  otherDependencyCredit: string;
  eligibleChildDependents: string;
  eligibleOtherDependents: string;
  studentLoanCapAmount: string;
}) {
  const t = useTranslations("settings.taxRetirement.filing");
  const tRoot = useTranslations();
  const tokens = useTokens();
  const { showToast } = useToast();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const { pending, run } = useServerAction();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    run(
      () => updateTaxFilingAction({}, formData),
      () => {
        showToast(t("successToast"), "success");
        router.refresh();
      },
      (err) => setError(err),
    );
  }

  const gridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 };

  return (
    <Box>
      <SectionHeader title={t("title")} subtitle={t("subtitle")} headingLevel="h2" />
      <Stack
        component="form"
        action={handleSubmit}
        sx={{
          gap: 2,
          border: `1px solid ${tokens.border}`,
          borderRadius: "10px",
          p: "20px",
          width: "100%",
        }}
        style={{ backgroundColor: tokens.cardBackground }}
      >
        <Box sx={gridSx}>
          <TextField
            select
            size="small"
            name="fillingType"
            label={t("filingStatusLabel")}
            defaultValue={props.fillingType}
            fullWidth
          >
            {FILING_STATUS_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {td(tRoot, FILING_STATUS_LABEL_KEYS[value])}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            name="stateTaxRate"
            label={t("stateTaxRateLabel")}
            defaultValue={props.stateTaxRate}
            fullWidth
            slotProps={{ input: { endAdornment: "%" } }}
          />
          <TextField
            size="small"
            name="socialSecurityRate"
            label={t("socialSecurityRateLabel")}
            defaultValue={props.socialSecurityRate}
            fullWidth
            slotProps={{ input: { endAdornment: "%" } }}
          />
          <TextField
            size="small"
            name="medicareRate"
            label={t("medicareRateLabel")}
            defaultValue={props.medicareRate}
            fullWidth
            slotProps={{ input: { endAdornment: "%" } }}
          />
          <TextField
            size="small"
            name="fourZeroOneKContributionRate"
            label={t("contributionRateLabel")}
            defaultValue={props.fourZeroOneKContributionRate}
            fullWidth
            slotProps={{ input: { endAdornment: "%" } }}
          />
          <TextField
            size="small"
            name="fourZeroOneKMatchRate"
            label={t("matchRateLabel")}
            defaultValue={props.fourZeroOneKMatchRate}
            fullWidth
            slotProps={{ input: { endAdornment: "%" } }}
          />
          <TextField
            size="small"
            name="fourZeroOneKMaxContributionRate"
            label={t("maxContributionLabel")}
            defaultValue={props.fourZeroOneKMaxContributionRate}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
          <TextField
            size="small"
            name="standardDeduction"
            label={t("standardDeductionLabel")}
            defaultValue={props.standardDeduction}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
          <TextField
            size="small"
            name="childDependencyCredit"
            label={t("childDependencyCreditLabel")}
            defaultValue={props.childDependencyCredit}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
          <TextField
            size="small"
            name="otherDependencyCredit"
            label={t("otherDependencyCreditLabel")}
            defaultValue={props.otherDependencyCredit}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
          <TextField
            size="small"
            name="eligibleChildDependents"
            label={t("eligibleChildDependentsLabel")}
            defaultValue={props.eligibleChildDependents}
            fullWidth
          />
          <TextField
            size="small"
            name="eligibleOtherDependents"
            label={t("eligibleOtherDependentsLabel")}
            defaultValue={props.eligibleOtherDependents}
            fullWidth
          />
          <TextField
            size="small"
            name="studentLoanCapAmount"
            label={t("studentLoanCapLabel")}
            defaultValue={props.studentLoanCapAmount}
            fullWidth
            slotProps={{ input: { startAdornment: "$" } }}
          />
        </Box>

        {error && <Alert severity="error">{td(tRoot, error)}</Alert>}

        <Box>
          <AdminButton type="submit" variant="contained" disabled={pending}>
            {t("saveButton")}
          </AdminButton>
        </Box>
      </Stack>
    </Box>
  );
}
