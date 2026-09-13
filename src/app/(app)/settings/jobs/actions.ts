"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PayPeriodType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/guards";

export interface FormResult {
  error?: string;
}

function revalidate() {
  revalidatePath("/settings/jobs");
}

const createJobSchema = z.object({
  name: z.string().trim().min(1, "settings.jobs.errors.nameRequired"),
  payPeriodType: z.enum(PayPeriodType, "settings.jobs.errors.invalidPayPeriod"),
});

export async function createJobAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const parsed = createJobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.job.create({
    data: { userId: user.id, name: parsed.data.name, payPeriodType: parsed.data.payPeriodType },
  });
  revalidate();
  return {};
}

async function assertOwnJob(id: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== userId) {
    throw new Error("settings.jobs.errors.jobNotFound");
  }
  return job;
}

export async function renameJobAction(id: string, name: string): Promise<FormResult> {
  try {
    const user = await requireUser();
    await assertOwnJob(id, user.id);
    const parsed = z.string().trim().min(1, "settings.jobs.errors.nameRequired").safeParse(name);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    await prisma.job.update({ where: { id }, data: { name: parsed.data } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function setJobPayPeriodAction(
  id: string,
  payPeriodType: string,
): Promise<FormResult> {
  try {
    const user = await requireUser();
    await assertOwnJob(id, user.id);
    const parsed = z.enum(PayPeriodType).safeParse(payPeriodType);
    if (!parsed.success) return { error: "settings.jobs.errors.invalidPayPeriod" };

    await prisma.job.update({ where: { id }, data: { payPeriodType: parsed.data } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function toggleJobActiveAction(id: string): Promise<FormResult> {
  try {
    const user = await requireUser();
    const job = await assertOwnJob(id, user.id);
    await prisma.job.update({ where: { id }, data: { isActive: !job.isActive } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteJobAction(id: string): Promise<FormResult> {
  try {
    const user = await requireUser();
    await assertOwnJob(id, user.id);
    const paycheckCount = await prisma.paycheck.count({ where: { jobId: id } });
    if (paycheckCount > 0) {
      return { error: "settings.jobs.errors.hasHistory" };
    }
    await prisma.job.delete({ where: { id } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
