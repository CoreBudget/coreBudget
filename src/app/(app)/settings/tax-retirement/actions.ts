"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { RetirementAccountType } from "@/generated/prisma/client";
import { FILING_STATUS_OPTIONS } from "./constants";

export interface FormResult {
  error?: string;
}

function revalidate() {
  revalidatePath("/settings/tax-retirement");
}

function optionalNumber() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.number().finite().optional(),
  );
}

function optionalInt() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.number().int().optional(),
  );
}

const taxFilingSchema = z.object({
  fillingType: z.enum(FILING_STATUS_OPTIONS, "settings.taxRetirement.errors.invalidFilingStatus"),
  stateTaxRate: optionalNumber(),
  socialSecurityRate: optionalNumber(),
  medicareRate: optionalNumber(),
  fourZeroOneKContributionRate: optionalNumber(),
  fourZeroOneKMatchRate: optionalNumber(),
  fourZeroOneKMaxContributionRate: optionalNumber(),
  standardDeduction: optionalNumber(),
  childDependencyCredit: optionalNumber(),
  otherDependencyCredit: optionalNumber(),
  eligibleChildDependents: optionalInt(),
  eligibleOtherDependents: optionalInt(),
  studentLoanCapAmount: optionalNumber(),
});

export async function updateTaxFilingAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = taxFilingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.userTaxSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });
  revalidate();
  return {};
}

const withholdingSchema = z.object({
  ytdWithheldAmount: optionalNumber(),
  estimatedTaxLiability: optionalNumber(),
});

export async function updateWithholdingAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = withholdingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.userTaxSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });
  revalidate();
  return {};
}

const retirementGoalSchema = z.object({
  retirementGoalAmount: optionalNumber(),
  retirementGoalAge: optionalInt(),
});

export async function updateRetirementGoalAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = retirementGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.userTaxSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });
  revalidate();
  return {};
}

const retirementAccountSchema = z.object({
  name: z.string().trim().min(1, "settings.taxRetirement.errors.nameRequired"),
  type: z.enum(RetirementAccountType, "settings.taxRetirement.errors.invalidType"),
  balance: z.coerce.number().finite("settings.taxRetirement.errors.balanceRequired"),
  contributionPct: optionalNumber(),
});

export async function createRetirementAccountAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = retirementAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const last = await prisma.retirementAccount.findFirst({
    where: { userId: user.id },
    orderBy: { order: "desc" },
  });

  await prisma.retirementAccount.create({
    data: { userId: user.id, order: (last?.order ?? -1) + 1, ...parsed.data },
  });
  revalidate();
  return {};
}

async function assertOwnRetirementAccount(id: string, userId: string) {
  const account = await prisma.retirementAccount.findUnique({ where: { id } });
  if (!account || account.userId !== userId) {
    throw new Error("settings.taxRetirement.errors.accountNotFound");
  }
  return account;
}

export async function updateRetirementAccountAction(
  id: string,
  field: "name" | "type" | "balance" | "contributionPct",
  value: string,
): Promise<FormResult> {
  try {
    const user = await requireUser();
    await assertOwnRetirementAccount(id, user.id);

    if (field === "name") {
      const parsed = z
        .string()
        .trim()
        .min(1, "settings.taxRetirement.errors.nameRequired")
        .safeParse(value);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message };
      await prisma.retirementAccount.update({ where: { id }, data: { name: parsed.data } });
    } else if (field === "type") {
      const parsed = z.enum(RetirementAccountType).safeParse(value);
      if (!parsed.success) return { error: "settings.taxRetirement.errors.invalidType" };
      await prisma.retirementAccount.update({ where: { id }, data: { type: parsed.data } });
    } else if (field === "balance") {
      const parsed = z.coerce.number().finite().safeParse(value);
      if (!parsed.success) return { error: "settings.taxRetirement.errors.balanceRequired" };
      await prisma.retirementAccount.update({ where: { id }, data: { balance: parsed.data } });
    } else {
      const parsed = optionalNumber().safeParse(value);
      if (!parsed.success) return { error: "settings.taxRetirement.errors.invalidContribution" };
      await prisma.retirementAccount.update({
        where: { id },
        data: { contributionPct: parsed.data ?? null },
      });
    }
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteRetirementAccountAction(id: string): Promise<FormResult> {
  try {
    const user = await requireUser();
    await assertOwnRetirementAccount(id, user.id);
    await prisma.retirementAccount.delete({ where: { id } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
