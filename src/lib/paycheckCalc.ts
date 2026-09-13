import type { PayPeriodType } from "@/generated/prisma/client";

export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
}

export interface WithholdingItem {
  id: string;
  name: string;
  amount: number;
  isPreTax: boolean;
  calculationType: "manual" | "401k";
  isEditableOnPaycheck: boolean;
}

export interface EmployerContributionItem {
  id: string;
  name: string;
  amount: number;
  calculationType: "manual" | "401k_match";
  taxable: boolean;
  isEditableOnPaycheck: boolean;
}

export type CalculationRule = "auto" | "manual";

export interface TaxRates {
  socialSecurityRate: number;
  medicareRate: number;
  stateTaxRate: number;
}

const DEFAULT_TAX_RATES: TaxRates = {
  socialSecurityRate: 6.2,
  medicareRate: 1.45,
  stateTaxRate: 0,
};

export function resolveTaxRates(settings: {
  socialSecurityRate?: number | null;
  medicareRate?: number | null;
  stateTaxRate?: number | null;
}): TaxRates {
  return {
    socialSecurityRate: settings.socialSecurityRate ?? DEFAULT_TAX_RATES.socialSecurityRate,
    medicareRate: settings.medicareRate ?? DEFAULT_TAX_RATES.medicareRate,
    stateTaxRate: settings.stateTaxRate ?? DEFAULT_TAX_RATES.stateTaxRate,
  };
}

const PAY_PERIODS_PER_YEAR: Record<PayPeriodType, number> = {
  weekly: 52,
  bi_weekly: 26,
  semi_monthly: 24,
  monthly: 12,
};

export function payPeriodsPerYear(payPeriodType: PayPeriodType): number {
  return PAY_PERIODS_PER_YEAR[payPeriodType];
}

export interface PaycheckComputeInput {
  grossIncome: number;
  incomeItems: IncomeItem[];
  withholdingItems: WithholdingItem[];
  employerContributionItems: EmployerContributionItem[];
  federalTaxAmount: number;
  oasdiCalculationRule: CalculationRule;
  oasdiAmount: number;
  medicareCalculationRule: CalculationRule;
  medicareAmount: number;
  stateTaxCalculationRule: CalculationRule;
  stateTaxAmount: number;
  taxRates: TaxRates;
  periodsPerYear: number;
}

export interface PaycheckComputeResult {
  totalIncomePerPeriod: number;
  totalWithholdingsPerPeriod: number;
  totalEmployerContributionsPerPeriod: number;
  oasdiAmount: number;
  medicareAmount: number;
  stateTaxAmount: number;
  federalTaxAmount: number;
  totalTaxesPerPeriod: number;
  netPayPerPeriod: number;
  netPayPerMonth: number;
  employee401kPerPeriod: number;
  employer401kMatchPerPeriod: number;
  total401kPerPeriod: number;
  total401kPerMonth: number;
  total401kPerYear: number;
  totalCompensationPerYear: number;
  grossSummaryNetPerYear: number;
  yearlyTaxesTotal: number;
}

function autoOr(rule: CalculationRule, manualAmount: number, autoAmount: number): number {
  return rule === "auto" ? autoAmount : manualAmount;
}

export function computePaycheck(input: PaycheckComputeInput): PaycheckComputeResult {
  const {
    grossIncome,
    incomeItems,
    withholdingItems,
    employerContributionItems,
    federalTaxAmount,
    oasdiCalculationRule,
    oasdiAmount: manualOasdi,
    medicareCalculationRule,
    medicareAmount: manualMedicare,
    stateTaxCalculationRule,
    stateTaxAmount: manualStateTax,
    taxRates,
    periodsPerYear,
  } = input;

  const monthlyFactor = periodsPerYear / 12;

  const totalIncomePerPeriod = grossIncome + incomeItems.reduce((sum, i) => sum + i.amount, 0);

  const preTax401k = withholdingItems
    .filter((w) => w.calculationType === "401k" && w.isPreTax)
    .reduce((sum, w) => sum + w.amount, 0);
  const preTaxOther = withholdingItems
    .filter((w) => w.calculationType !== "401k" && w.isPreTax)
    .reduce((sum, w) => sum + w.amount, 0);
  const totalWithholdingsPerPeriod = withholdingItems.reduce((sum, w) => sum + w.amount, 0);

  const employer401kMatch = employerContributionItems
    .filter((e) => e.calculationType === "401k_match")
    .reduce((sum, e) => sum + e.amount, 0);
  const taxableEmployerContrib = employerContributionItems
    .filter((e) => e.taxable)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalEmployerContributionsPerPeriod = employerContributionItems.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const ficaBase = Math.max(0, totalIncomePerPeriod - preTaxOther + taxableEmployerContrib);
  const stateFederalBase = Math.max(0, ficaBase - preTax401k);

  const oasdiAmount = autoOr(
    oasdiCalculationRule,
    manualOasdi,
    ficaBase * (taxRates.socialSecurityRate / 100),
  );
  const medicareAmount = autoOr(
    medicareCalculationRule,
    manualMedicare,
    ficaBase * (taxRates.medicareRate / 100),
  );
  const stateTaxAmount = autoOr(
    stateTaxCalculationRule,
    manualStateTax,
    stateFederalBase * (taxRates.stateTaxRate / 100),
  );

  const totalTaxesPerPeriod = oasdiAmount + medicareAmount + stateTaxAmount + federalTaxAmount;
  const netPayPerPeriod = totalIncomePerPeriod - totalTaxesPerPeriod - totalWithholdingsPerPeriod;

  const employee401kPerPeriod = preTax401k;
  const employer401kMatchPerPeriod = employer401kMatch;
  const total401kPerPeriod = employee401kPerPeriod + employer401kMatchPerPeriod;

  const otherIncomePerYear = incomeItems.reduce((sum, i) => sum + i.amount, 0) * periodsPerYear;
  const totalCompensationPerYear =
    grossIncome * periodsPerYear +
    otherIncomePerYear +
    totalEmployerContributionsPerPeriod * periodsPerYear;
  const grossSummaryNetPerYear = netPayPerPeriod * periodsPerYear;

  return {
    totalIncomePerPeriod,
    totalWithholdingsPerPeriod,
    totalEmployerContributionsPerPeriod,
    oasdiAmount,
    medicareAmount,
    stateTaxAmount,
    federalTaxAmount,
    totalTaxesPerPeriod,
    netPayPerPeriod,
    netPayPerMonth: netPayPerPeriod * monthlyFactor,
    employee401kPerPeriod,
    employer401kMatchPerPeriod,
    total401kPerPeriod,
    total401kPerMonth: total401kPerPeriod * monthlyFactor,
    total401kPerYear: total401kPerPeriod * periodsPerYear,
    totalCompensationPerYear,
    grossSummaryNetPerYear,
    yearlyTaxesTotal: totalTaxesPerPeriod * periodsPerYear,
  };
}
