"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { PayPeriodType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auditLog";
import type {
  CalculationRule,
  EmployerContributionItem,
  IncomeItem,
  WithholdingItem,
} from "@/lib/paycheckCalc";

export interface FormResult {
  error?: string;
}

function revalidate() {
  revalidatePath("/income-calculator");
}

async function assertOwnJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new Error("incomeCalculator.errors.jobNotFound");
  }
  return job;
}

async function assertOwnPaycheck(paycheckId: string, userId: string) {
  const paycheck = await prisma.paycheck.findUnique({
    where: { id: paycheckId },
    include: { job: true },
  });
  if (!paycheck || paycheck.job.userId !== userId) {
    throw new Error("incomeCalculator.errors.paycheckNotFound");
  }
  return paycheck;
}

const lineItemSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1),
  amount: z.coerce.number().finite(),
});

const withholdingItemSchema = lineItemSchema.extend({
  isPreTax: z.boolean(),
  calculationType: z.enum(["manual", "401k"]),
  isEditableOnPaycheck: z.boolean(),
});

const employerContributionItemSchema = lineItemSchema.extend({
  calculationType: z.enum(["manual", "401k_match"]),
  taxable: z.boolean(),
  isEditableOnPaycheck: z.boolean(),
});

const calculationRuleSchema = z.enum(["auto", "manual"]);

const templateSchema = z.object({
  grossIncome: z.coerce.number().finite(),
  incomeItems: z.array(lineItemSchema),
  withholdingItems: z.array(withholdingItemSchema),
  employerContributionItems: z.array(employerContributionItemSchema),
  federalTaxAmount: z.coerce.number().finite(),
  oasdiAmount: z.coerce.number().finite(),
  oasdiCalculationRule: calculationRuleSchema,
  medicareAmount: z.coerce.number().finite(),
  medicareCalculationRule: calculationRuleSchema,
  stateTaxAmount: z.coerce.number().finite(),
  stateTaxCalculationRule: calculationRuleSchema,
});

export type TemplateInput = z.infer<typeof templateSchema>;

export async function saveTemplateAction(jobId: string, data: TemplateInput): Promise<FormResult> {
  try {
    const user = await requireUser();
    const job = await assertOwnJob(jobId, user.id);
    const parsed = templateSchema.safeParse(data);
    if (!parsed.success) return { error: "incomeCalculator.errors.invalidTemplate" };

    const existed = (await prisma.paycheckTemplate.findUnique({ where: { jobId } })) !== null;
    const template = await prisma.paycheckTemplate.upsert({
      where: { jobId },
      create: { jobId, ...parsed.data },
      update: { ...parsed.data },
    });

    await logAudit({
      userId: user.id,
      action: existed ? "update" : "create",
      entityType: "PaycheckTemplate",
      entityId: template.id,
      summary: `${existed ? "Updated" : "Created"} paycheck template for '${job.name}'`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const paycheckSchema = z.object({
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  grossIncome: z.coerce.number().finite(),
  incomeItems: z.array(lineItemSchema),
  withholdingItems: z.array(withholdingItemSchema),
  employerContributionItems: z.array(employerContributionItemSchema),
  federalTaxAmount: z.coerce.number().finite(),
  oasdiAmount: z.coerce.number().finite(),
  medicareAmount: z.coerce.number().finite(),
  stateTaxAmount: z.coerce.number().finite(),
});

export type PaycheckInput = z.infer<typeof paycheckSchema>;

export async function logPaycheckAction(jobId: string, data: PaycheckInput): Promise<FormResult> {
  try {
    const user = await requireUser();
    const job = await assertOwnJob(jobId, user.id);
    const parsed = paycheckSchema.safeParse(data);
    if (!parsed.success) return { error: "incomeCalculator.errors.invalidPaycheck" };

    const paycheck = await prisma.paycheck.create({
      data: {
        jobId,
        periodStartDate: new Date(parsed.data.periodStartDate),
        periodEndDate: new Date(parsed.data.periodEndDate),
        grossIncome: parsed.data.grossIncome,
        incomeItems: parsed.data.incomeItems,
        withholdingItems: parsed.data.withholdingItems,
        employerContributionItems: parsed.data.employerContributionItems,
        federalTaxAmount: parsed.data.federalTaxAmount,
        oasdiAmount: parsed.data.oasdiAmount,
        medicareAmount: parsed.data.medicareAmount,
        stateTaxAmount: parsed.data.stateTaxAmount,
      },
    });

    await logAudit({
      userId: user.id,
      action: "create",
      entityType: "Paycheck",
      entityId: paycheck.id,
      summary: `Logged paycheck for '${job.name}' (${parsed.data.periodStartDate} to ${parsed.data.periodEndDate})`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function updatePaycheckAction(
  paycheckId: string,
  data: PaycheckInput,
): Promise<FormResult> {
  try {
    const user = await requireUser();
    const existing = await assertOwnPaycheck(paycheckId, user.id);
    const parsed = paycheckSchema.safeParse(data);
    if (!parsed.success) return { error: "incomeCalculator.errors.invalidPaycheck" };

    await prisma.paycheck.update({
      where: { id: paycheckId },
      data: {
        periodStartDate: new Date(parsed.data.periodStartDate),
        periodEndDate: new Date(parsed.data.periodEndDate),
        grossIncome: parsed.data.grossIncome,
        incomeItems: parsed.data.incomeItems,
        withholdingItems: parsed.data.withholdingItems,
        employerContributionItems: parsed.data.employerContributionItems,
        federalTaxAmount: parsed.data.federalTaxAmount,
        oasdiAmount: parsed.data.oasdiAmount,
        medicareAmount: parsed.data.medicareAmount,
        stateTaxAmount: parsed.data.stateTaxAmount,
      },
    });

    await logAudit({
      userId: user.id,
      action: "update",
      entityType: "Paycheck",
      entityId: paycheckId,
      summary: `Edited paycheck for '${existing.job.name}' (${parsed.data.periodStartDate} to ${parsed.data.periodEndDate})`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

interface QuickAddPaycheckJob {
  id: string;
  name: string;
  payPeriodType: PayPeriodType;
  isActive: boolean;
}

interface QuickAddPaycheckTemplate {
  grossIncome: number;
  incomeItems: IncomeItem[];
  withholdingItems: WithholdingItem[];
  employerContributionItems: EmployerContributionItem[];
  federalTaxAmount: number;
  oasdiAmount: number;
  oasdiCalculationRule: CalculationRule;
  medicareAmount: number;
  medicareCalculationRule: CalculationRule;
  stateTaxAmount: number;
  stateTaxCalculationRule: CalculationRule;
}

export interface QuickAddPaycheckContext {
  locale: string | null;
  jobs: QuickAddPaycheckJob[];
  taxRates: {
    socialSecurityRate: number | null;
    medicareRate: number | null;
    stateTaxRate: number | null;
  };
  templatesByJobId: Record<string, QuickAddPaycheckTemplate>;
}

export async function getQuickAddPaycheckContextAction(): Promise<QuickAddPaycheckContext> {
  const user = await requireUser();
  const [jobs, taxSettings, templates] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.userTaxSettings.findUnique({ where: { userId: user.id } }),
    prisma.paycheckTemplate.findMany({ where: { job: { userId: user.id } } }),
  ]);

  const templatesByJobId: Record<string, QuickAddPaycheckTemplate> = {};
  for (const template of templates) {
    templatesByJobId[template.jobId] = {
      grossIncome: Number(template.grossIncome),
      incomeItems: template.incomeItems as unknown as IncomeItem[],
      withholdingItems: template.withholdingItems as unknown as WithholdingItem[],
      employerContributionItems:
        template.employerContributionItems as unknown as EmployerContributionItem[],
      federalTaxAmount: Number(template.federalTaxAmount),
      oasdiAmount: Number(template.oasdiAmount),
      oasdiCalculationRule: (template.oasdiCalculationRule ?? "auto") as CalculationRule,
      medicareAmount: Number(template.medicareAmount),
      medicareCalculationRule: (template.medicareCalculationRule ?? "auto") as CalculationRule,
      stateTaxAmount: Number(template.stateTaxAmount),
      stateTaxCalculationRule: (template.stateTaxCalculationRule ?? "auto") as CalculationRule,
    };
  }

  return {
    locale: user.locale,
    jobs: jobs.map((j) => ({
      id: j.id,
      name: j.name,
      payPeriodType: j.payPeriodType,
      isActive: j.isActive,
    })),
    taxRates: {
      socialSecurityRate: taxSettings?.socialSecurityRate
        ? Number(taxSettings.socialSecurityRate)
        : null,
      medicareRate: taxSettings?.medicareRate ? Number(taxSettings.medicareRate) : null,
      stateTaxRate: taxSettings?.stateTaxRate ? Number(taxSettings.stateTaxRate) : null,
    },
    templatesByJobId,
  };
}

export async function deletePaycheckAction(paycheckId: string): Promise<FormResult> {
  try {
    const user = await requireUser();
    const existing = await assertOwnPaycheck(paycheckId, user.id);
    await prisma.paycheck.delete({ where: { id: paycheckId } });

    await logAudit({
      userId: user.id,
      action: "delete",
      entityType: "Paycheck",
      entityId: paycheckId,
      summary: `Deleted paycheck for '${existing.job.name}' (${existing.periodStartDate.toISOString().slice(0, 10)} to ${existing.periodEndDate.toISOString().slice(0, 10)})`,
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
