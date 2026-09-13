import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature, type Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { requireInstanceFeatureEnabled } from "@/lib/platformFeatures";
import type { EmployerContributionItem, IncomeItem, WithholdingItem } from "@/lib/paycheckCalc";
import ComingSoon from "../../_shared/ComingSoon";
import IncomeCalculatorPanel from "./IncomeCalculatorPanel";

function asIncomeItems(value: Prisma.JsonValue): IncomeItem[] {
  return value as unknown as IncomeItem[];
}
function asWithholdingItems(value: Prisma.JsonValue): WithholdingItem[] {
  return value as unknown as WithholdingItem[];
}
function asEmployerContributionItems(value: Prisma.JsonValue): EmployerContributionItem[] {
  return value as unknown as EmployerContributionItem[];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("incomeCalculator.metaTitle") };
}

export default async function IncomeCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; year?: string }>;
}) {
  const user = await requireUser();
  await requireInstanceFeatureEnabled(Feature.income_calculator);
  const { job: jobParam, year: yearParam } = await searchParams;

  const [jobs, taxSettings] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.userTaxSettings.findUnique({ where: { userId: user.id } }),
  ]);

  if (jobs.length === 0) {
    const t = await getTranslations();
    return (
      <ComingSoon
        title={t("incomeCalculator.title")}
        subtitle={t("incomeCalculator.noJobsSubtitle")}
      />
    );
  }

  const selectedJob =
    jobs.find((j) => j.id === jobParam) ?? jobs.find((j) => j.isActive) ?? jobs[0];

  const currentYear = new Date().getUTCFullYear();
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const selectedYear = Number.isInteger(parsedYear) ? parsedYear : currentYear;
  const yearStart = new Date(Date.UTC(selectedYear, 0, 1));
  const yearEnd = new Date(Date.UTC(selectedYear + 1, 0, 1));

  const [template, paychecks, paycheckDates] = await Promise.all([
    prisma.paycheckTemplate.findUnique({ where: { jobId: selectedJob.id } }),
    prisma.paycheck.findMany({
      where: { jobId: selectedJob.id, periodStartDate: { gte: yearStart, lt: yearEnd } },
      orderBy: { periodStartDate: "desc" },
    }),
    prisma.paycheck.findMany({
      where: { jobId: selectedJob.id },
      select: { periodStartDate: true },
    }),
  ]);

  const years = Array.from(
    new Set([
      currentYear,
      selectedYear,
      ...paycheckDates.map((p) => p.periodStartDate.getUTCFullYear()),
    ]),
  ).sort((a, b) => b - a);

  return (
    <IncomeCalculatorPanel
      locale={user.locale}
      jobs={jobs.map((j) => ({ id: j.id, name: j.name, payPeriodType: j.payPeriodType }))}
      selectedJobId={selectedJob.id}
      selectedJobPayPeriodType={selectedJob.payPeriodType}
      years={years}
      selectedYear={selectedYear}
      taxRates={{
        socialSecurityRate: taxSettings?.socialSecurityRate?.toString() ?? null,
        medicareRate: taxSettings?.medicareRate?.toString() ?? null,
        stateTaxRate: taxSettings?.stateTaxRate?.toString() ?? null,
      }}
      template={
        template
          ? {
              grossIncome: template.grossIncome.toString(),
              incomeItems: asIncomeItems(template.incomeItems),
              withholdingItems: asWithholdingItems(template.withholdingItems),
              employerContributionItems: asEmployerContributionItems(
                template.employerContributionItems,
              ),
              federalTaxAmount: template.federalTaxAmount.toString(),
              oasdiAmount: template.oasdiAmount.toString(),
              oasdiCalculationRule: template.oasdiCalculationRule ?? "auto",
              medicareAmount: template.medicareAmount.toString(),
              medicareCalculationRule: template.medicareCalculationRule ?? "auto",
              stateTaxAmount: template.stateTaxAmount.toString(),
              stateTaxCalculationRule: template.stateTaxCalculationRule ?? "auto",
            }
          : null
      }
      paychecks={paychecks.map((p) => ({
        id: p.id,
        periodStartDate: p.periodStartDate.toISOString().slice(0, 10),
        periodEndDate: p.periodEndDate.toISOString().slice(0, 10),
        grossIncome: p.grossIncome.toString(),
        incomeItems: asIncomeItems(p.incomeItems),
        withholdingItems: asWithholdingItems(p.withholdingItems),
        employerContributionItems: asEmployerContributionItems(p.employerContributionItems),
        federalTaxAmount: p.federalTaxAmount.toString(),
        oasdiAmount: p.oasdiAmount.toString(),
        medicareAmount: p.medicareAmount.toString(),
        stateTaxAmount: p.stateTaxAmount.toString(),
      }))}
    />
  );
}
