"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AssetType, Feature, LiabilityType, Prisma } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";

export interface FormResult {
  error?: string;
  assetId?: string;
  liabilityId?: string;
  imported?: number;
}

const CASH_TYPES = new Set(["checking", "savings", "cash", "investment"]);

async function requireEditAccess(feature: Feature) {
  const { workspace, level } = await requireFeature(feature);
  if (level !== "edit") throw new Error("netWorth.errors.readOnly");
  return workspace;
}

async function assertAssetInBudget(assetId: string, budgetId: string) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.budgetId !== budgetId) throw new Error("netWorth.errors.assetNotFound");
  return asset;
}

async function assertLiabilityInBudget(liabilityId: string, budgetId: string) {
  const liability = await prisma.liability.findUnique({ where: { id: liabilityId } });
  if (!liability || liability.budgetId !== budgetId) {
    throw new Error("netWorth.errors.liabilityNotFound");
  }
  return liability;
}

function revalidate() {
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

function optionalDate() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.date().optional(),
  );
}

function optionalNumber() {
  return z.preprocess((val) => {
    if (typeof val !== "string") return val;
    const cleaned = val.trim().replace(/[$,]/g, "");
    if (cleaned === "") return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }, z.coerce.number().finite().optional());
}

function optionalDayOfMonth() {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.number().int().min(1).max(31).optional(),
  );
}

const createAssetSchema = z.object({
  name: z.string().trim().min(1, "netWorth.errors.nameRequired"),
  type: z.enum(AssetType),
  value: z.coerce.number().finite(),
  description: z.string().optional(),
  purchaseDate: optionalDate(),
});

export async function createAssetAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_assets);
    const parsed = createAssetSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { name, type, value, description, purchaseDate } = parsed.data;

    const maxOrder = await prisma.asset.aggregate({
      where: { budgetId: workspace.budget.id },
      _max: { order: true },
    });

    const asset = await prisma.asset.create({
      data: {
        budgetId: workspace.budget.id,
        name,
        type,
        value,
        description: description?.trim() || null,
        purchaseDate: purchaseDate ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
        valueChanges: { create: { date: new Date(), value } },
      },
    });

    revalidate();
    return { assetId: asset.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const createLiabilitySchema = z.object({
  name: z.string().trim().min(1, "netWorth.errors.nameRequired"),
  type: z.enum(LiabilityType),
  startingBalance: z.coerce.number().finite(),
  interestRate: optionalNumber(),
  minimumPayment: optionalNumber(),
  paymentDueDay: optionalDayOfMonth(),
  loanStartDate: optionalDate(),
});

export async function createLiabilityAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const parsed = createLiabilitySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const {
      name,
      type,
      startingBalance,
      interestRate,
      minimumPayment,
      paymentDueDay,
      loanStartDate,
    } = parsed.data;
    if (!loanStartDate) return { error: "netWorth.errors.loanStartDateRequired" };

    const maxOrder = await prisma.liability.aggregate({
      where: { budgetId: workspace.budget.id },
      _max: { order: true },
    });

    const liability = await prisma.liability.create({
      data: {
        budgetId: workspace.budget.id,
        name,
        type,
        startingBalance,
        balance: startingBalance,
        interestRate: interestRate ?? null,
        minimumPayment: minimumPayment ?? null,
        paymentDueDay: paymentDueDay ?? null,
        loanStartDate,
        order: (maxOrder._max.order ?? -1) + 1,
        balanceChanges: { create: { date: new Date(), balance: startingBalance } },
      },
    });

    revalidate();
    return { liabilityId: liability.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const updateAssetSchema = z.object({
  name: z.string().trim().min(1, "netWorth.errors.nameRequired"),
  type: z.enum(AssetType),
  description: z.string().optional(),
  purchaseDate: optionalDate(),
});

export async function updateAssetAction(
  assetId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_assets);
    await assertAssetInBudget(assetId, workspace.budget.id);
    const parsed = updateAssetSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { name, type, description, purchaseDate } = parsed.data;

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        name,
        type,
        description: description?.trim() || null,
        purchaseDate: purchaseDate ?? null,
      },
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const updateLiabilitySchema = z.object({
  name: z.string().trim().min(1, "netWorth.errors.nameRequired"),
  type: z.enum(LiabilityType),
  interestRate: optionalNumber(),
  minimumPayment: optionalNumber(),
  paymentDueDay: optionalDayOfMonth(),
  loanStartDate: optionalDate(),
});

export async function updateLiabilityAction(
  liabilityId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    await assertLiabilityInBudget(liabilityId, workspace.budget.id);
    const parsed = updateLiabilitySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { name, type, interestRate, minimumPayment, paymentDueDay, loanStartDate } = parsed.data;

    await prisma.liability.update({
      where: { id: liabilityId },
      data: {
        name,
        type,
        interestRate: interestRate ?? null,
        minimumPayment: minimumPayment ?? null,
        paymentDueDay: paymentDueDay ?? null,
        loanStartDate: loanStartDate ?? null,
      },
    });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const updateBalanceSchema = z.object({
  date: z.coerce.date(),
  balance: z.coerce.number().finite(),
  interestPaidToDate: optionalNumber(),
});

export async function updateLiabilityBalanceAction(
  liabilityId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    await assertLiabilityInBudget(liabilityId, workspace.budget.id);
    const parsed = updateBalanceSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { date, balance, interestPaidToDate } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.liability.update({
        where: { id: liabilityId },
        data: {
          balance,
          ...(interestPaidToDate != null ? { interestPaidToDate } : {}),
        },
      });
      await tx.liabilityBalanceChange.create({
        data: { liabilityId, date, balance, description: "Manual balance update" },
      });
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const recordValueSchema = z.object({
  value: z.coerce.number().finite(),
  date: z.coerce.date(),
  description: z.string().optional(),
});

export async function recordAssetValueAction(
  assetId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_assets);
    await assertAssetInBudget(assetId, workspace.budget.id);
    const parsed = recordValueSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { value, date, description } = parsed.data;

    await prisma.assetValueChange.create({
      data: { assetId, date, value, description: description?.trim() || null },
    });

    const latest = await prisma.assetValueChange.findFirst({
      where: { assetId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    if (latest) {
      await prisma.asset.update({ where: { id: assetId }, data: { value: latest.value } });
    }

    revalidate();
    revalidatePath(`/net-worth/assets/${assetId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteAssetAction(assetId: string): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_assets);
    await assertAssetInBudget(assetId, workspace.budget.id);
    await prisma.asset.delete({ where: { id: assetId } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteLiabilityAction(liabilityId: string): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    await assertLiabilityInBudget(liabilityId, workspace.budget.id);
    await prisma.liability.delete({ where: { id: liabilityId } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

function splitPayment({
  balance,
  interestRate,
  since,
  date,
  paymentAmount,
  principal,
  interest,
}: {
  balance: number;
  interestRate: number;
  since: Date;
  date: Date;
  paymentAmount?: number;
  principal?: number;
  interest?: number;
}): { principalPortion: number; interestPortion: number; totalPayment: number } | null {
  if (principal != null && interest != null) {
    return {
      principalPortion: principal,
      interestPortion: interest,
      totalPayment: principal + interest,
    };
  }
  if (paymentAmount != null && paymentAmount > 0) {
    const daysElapsed = Math.max(
      0,
      Math.round((date.getTime() - since.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const dailyRate = interestRate / 100 / 365;
    const interestPortion = Math.min(paymentAmount, balance * dailyRate * daysElapsed);
    return {
      principalPortion: paymentAmount - interestPortion,
      interestPortion,
      totalPayment: paymentAmount,
    };
  }
  return null;
}

const recordPaymentSchema = z.object({
  date: z.coerce.date(),
  accountId: z.string().optional(),
  paymentAmount: optionalNumber(),
  principal: optionalNumber(),
  interest: optionalNumber(),
  escrowAmount: optionalNumber(),
  notes: z.string().optional(),
});

export async function recordLiabilityPaymentAction(
  liabilityId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const liability = await assertLiabilityInBudget(liabilityId, workspace.budget.id);
    const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { date, accountId, paymentAmount, principal, interest, escrowAmount, notes } =
      parsed.data;

    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.budgetId !== workspace.budget.id || !CASH_TYPES.has(account.type)) {
        return { error: "netWorth.errors.invalidAccount" };
      }
    }

    const balance = Number(liability.balance);
    const lastPayment = await prisma.liabilityPayment.findFirst({
      where: { liabilityId },
      orderBy: { date: "desc" },
    });
    const since = lastPayment?.date ?? liability.loanStartDate ?? liability.createdAt;
    const split = splitPayment({
      balance,
      interestRate: Number(liability.interestRate ?? 0),
      since,
      date,
      paymentAmount,
      principal,
      interest,
    });
    if (!split) return { error: "netWorth.errors.invalidAmount" };
    const { principalPortion, interestPortion, totalPayment } = split;

    const newBalance = Math.max(0, balance - principalPortion);

    await prisma.$transaction(async (tx) => {
      const payment = await tx.liabilityPayment.create({
        data: {
          liabilityId,
          date,
          paymentAmount: totalPayment,
          principal: principalPortion,
          interest: interestPortion,
          escrowAmount: escrowAmount ?? null,
          endingBalance: newBalance,
          accountId: accountId || null,
          notes: notes?.trim() || null,
        },
      });

      await tx.liability.update({
        where: { id: liabilityId },
        data: { balance: newBalance, interestPaidToDate: { increment: interestPortion } },
      });

      await tx.liabilityBalanceChange.create({
        data: {
          liabilityId,
          date,
          balance: newBalance,
          description: `Payment of ${totalPayment.toFixed(2)}`,
        },
      });

      if (escrowAmount && escrowAmount > 0) {
        await tx.escrowEntry.create({
          data: {
            liabilityId,
            date,
            type: "deposit",
            amount: escrowAmount,
            runningBalance: 0,
            liabilityPaymentId: payment.id,
          },
        });
        await recalculateEscrowBalance(tx, liabilityId);
      }
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const MAX_IMPORT_ROWS = 500;

const importRowSchema = z.object({
  date: z
    .string()
    .min(1, "netWorth.errors.importRowInvalid")
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), "netWorth.errors.importRowInvalid"),
  accountId: z.string().optional(),
  paymentAmount: optionalNumber(),
  principal: optionalNumber(),
  interest: optionalNumber(),
  escrowAmount: optionalNumber(),
  notes: z.string().optional(),
});

export async function importLiabilityPaymentsAction(
  liabilityId: string,
  rows: Record<string, string>[],
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const liability = await assertLiabilityInBudget(liabilityId, workspace.budget.id);

    if (rows.length === 0) return { error: "netWorth.errors.importEmpty" };
    if (rows.length > MAX_IMPORT_ROWS) return { error: "netWorth.errors.importTooLarge" };

    const parsedRows: {
      date: Date;
      accountId?: string;
      paymentAmount?: number;
      principal?: number;
      interest?: number;
      escrowAmount?: number;
      notes?: string;
    }[] = [];
    for (const row of rows) {
      const parsed = importRowSchema.safeParse(row);
      if (!parsed.success) return { error: parsed.error.issues[0]?.message };
      const d = parsed.data;
      if (
        (d.principal == null || d.interest == null) &&
        !(d.paymentAmount != null && d.paymentAmount > 0)
      ) {
        return { error: "netWorth.errors.importRowInvalid" };
      }
      parsedRows.push(d);
    }
    parsedRows.sort((a, b) => a.date.getTime() - b.date.getTime());

    const importAccountId = parsedRows.find((r) => r.accountId)?.accountId;
    if (importAccountId) {
      const account = await prisma.account.findUnique({ where: { id: importAccountId } });
      if (!account || account.budgetId !== workspace.budget.id || !CASH_TYPES.has(account.type)) {
        return { error: "netWorth.errors.invalidAccount" };
      }
    }

    const interestRate = Number(liability.interestRate ?? 0);
    let runningBalance = Number(liability.balance);
    const lastPayment = await prisma.liabilityPayment.findFirst({
      where: { liabilityId },
      orderBy: { date: "desc" },
    });
    let since = lastPayment?.date ?? liability.loanStartDate ?? liability.createdAt;
    let hasEscrowRows = false;

    await prisma.$transaction(async (tx) => {
      for (const row of parsedRows) {
        const split = splitPayment({
          balance: runningBalance,
          interestRate,
          since,
          date: row.date,
          paymentAmount: row.paymentAmount,
          principal: row.principal,
          interest: row.interest,
        });
        if (!split) continue;

        const newBalance = Math.max(0, runningBalance - split.principalPortion);
        const payment = await tx.liabilityPayment.create({
          data: {
            liabilityId,
            date: row.date,
            paymentAmount: split.totalPayment,
            principal: split.principalPortion,
            interest: split.interestPortion,
            escrowAmount: row.escrowAmount ?? null,
            endingBalance: newBalance,
            accountId: row.accountId || null,
            notes: row.notes?.trim() || null,
          },
        });

        if (row.escrowAmount && row.escrowAmount > 0) {
          hasEscrowRows = true;
          await tx.escrowEntry.create({
            data: {
              liabilityId,
              date: row.date,
              type: "deposit",
              amount: row.escrowAmount,
              runningBalance: 0,
              liabilityPaymentId: payment.id,
            },
          });
        }

        runningBalance = newBalance;
        since = row.date;
      }

      await recalculateLiabilityBalance(tx, liabilityId);
      if (hasEscrowRows) await recalculateEscrowBalance(tx, liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${liabilityId}`);
    return { imported: parsedRows.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

async function recalculateLiabilityBalance(tx: Prisma.TransactionClient, liabilityId: string) {
  const liability = await tx.liability.findUniqueOrThrow({ where: { id: liabilityId } });
  const payments = await tx.liabilityPayment.findMany({
    where: { liabilityId },
    orderBy: { date: "asc" },
  });

  if (payments.length === 0) return;

  let balance = Number(liability.startingBalance);
  let totalInterest = 0;
  const balanceByPaymentId = new Map<string, number>();

  for (const p of payments) {
    balance = Math.max(0, balance - Number(p.principal));
    totalInterest += Number(p.interest);
    balanceByPaymentId.set(p.id, balance);
    if (Number(p.endingBalance) !== balance) {
      await tx.liabilityPayment.update({ where: { id: p.id }, data: { endingBalance: balance } });
    }
  }

  await tx.liability.update({
    where: { id: liabilityId },
    data: { balance, interestPaidToDate: totalInterest },
  });

  await tx.liabilityBalanceChange.deleteMany({ where: { liabilityId } });
  await tx.liabilityBalanceChange.create({
    data: {
      liabilityId,
      date: liability.loanStartDate ?? liability.createdAt,
      balance: liability.startingBalance,
      description: "Starting balance",
    },
  });
  for (const p of payments) {
    await tx.liabilityBalanceChange.create({
      data: {
        liabilityId,
        date: p.date,
        balance: balanceByPaymentId.get(p.id) ?? 0,
        description: `Payment of ${Number(p.paymentAmount).toFixed(2)}`,
      },
    });
  }
}

async function recalculateEscrowBalance(tx: Prisma.TransactionClient, liabilityId: string) {
  const entries = await tx.escrowEntry.findMany({
    where: { liabilityId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  let running = 0;
  for (const e of entries) {
    running = e.type === "deposit" ? running + Number(e.amount) : running - Number(e.amount);
    if (Number(e.runningBalance) !== running) {
      await tx.escrowEntry.update({ where: { id: e.id }, data: { runningBalance: running } });
    }
  }
}

async function assertPaymentInBudget(paymentId: string, budgetId: string) {
  const payment = await prisma.liabilityPayment.findUnique({
    where: { id: paymentId },
    include: { liability: true },
  });
  if (!payment || payment.liability.budgetId !== budgetId) {
    throw new Error("netWorth.errors.paymentNotFound");
  }
  return payment;
}

const editPaymentSchema = z.object({
  date: z.coerce.date(),
  accountId: z.string().optional(),
  principal: z.coerce.number(),
  interest: z.coerce.number(),
  escrowAmount: optionalNumber(),
  notes: z.string().optional(),
});

export async function updateLiabilityPaymentAction(
  paymentId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const payment = await assertPaymentInBudget(paymentId, workspace.budget.id);
    const parsed = editPaymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { date, accountId, principal, interest, escrowAmount, notes } = parsed.data;

    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.budgetId !== workspace.budget.id || !CASH_TYPES.has(account.type)) {
        return { error: "netWorth.errors.invalidAccount" };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.liabilityPayment.update({
        where: { id: paymentId },
        data: {
          date,
          principal,
          interest,
          paymentAmount: principal + interest,
          escrowAmount: escrowAmount ?? null,
          accountId: accountId || null,
          notes: notes?.trim() || null,
        },
      });

      const existingEscrow = await tx.escrowEntry.findFirst({
        where: { liabilityPaymentId: paymentId },
      });
      if (escrowAmount && escrowAmount > 0) {
        if (existingEscrow) {
          await tx.escrowEntry.update({
            where: { id: existingEscrow.id },
            data: { date, amount: escrowAmount },
          });
        } else {
          await tx.escrowEntry.create({
            data: {
              liabilityId: payment.liabilityId,
              date,
              type: "deposit",
              amount: escrowAmount,
              runningBalance: 0,
              liabilityPaymentId: paymentId,
            },
          });
        }
      } else if (existingEscrow) {
        await tx.escrowEntry.delete({ where: { id: existingEscrow.id } });
      }

      await recalculateLiabilityBalance(tx, payment.liabilityId);
      await recalculateEscrowBalance(tx, payment.liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${payment.liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteLiabilityPaymentAction(paymentId: string): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const payment = await assertPaymentInBudget(paymentId, workspace.budget.id);

    await prisma.$transaction(async (tx) => {
      await tx.escrowEntry.deleteMany({ where: { liabilityPaymentId: paymentId } });
      await tx.liabilityPayment.delete({ where: { id: paymentId } });
      await recalculateLiabilityBalance(tx, payment.liabilityId);
      await recalculateEscrowBalance(tx, payment.liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${payment.liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

const disbursementSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().positive("netWorth.errors.invalidAmount"),
  description: z.string().optional(),
});

export async function addEscrowDisbursementAction(
  liabilityId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    await assertLiabilityInBudget(liabilityId, workspace.budget.id);
    const parsed = disbursementSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { date, amount, description } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.escrowEntry.create({
        data: {
          liabilityId,
          date,
          type: "disbursement",
          amount,
          runningBalance: 0,
          description: description?.trim() || null,
        },
      });
      await recalculateEscrowBalance(tx, liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

async function assertDisbursementInBudget(entryId: string, budgetId: string) {
  const entry = await prisma.escrowEntry.findUnique({
    where: { id: entryId },
    include: { liability: true },
  });
  if (!entry || entry.liability.budgetId !== budgetId || entry.type !== "disbursement") {
    throw new Error("netWorth.errors.disbursementNotFound");
  }
  return entry;
}

export async function updateEscrowDisbursementAction(
  entryId: string,
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const entry = await assertDisbursementInBudget(entryId, workspace.budget.id);
    const parsed = disbursementSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    const { date, amount, description } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.escrowEntry.update({
        where: { id: entryId },
        data: { date, amount, description: description?.trim() || null },
      });
      await recalculateEscrowBalance(tx, entry.liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${entry.liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function deleteEscrowDisbursementAction(entryId: string): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    const entry = await assertDisbursementInBudget(entryId, workspace.budget.id);

    await prisma.$transaction(async (tx) => {
      await tx.escrowEntry.delete({ where: { id: entryId } });
      await recalculateEscrowBalance(tx, entry.liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${entry.liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}

export async function recalculateLiabilityAction(liabilityId: string): Promise<FormResult> {
  try {
    const workspace = await requireEditAccess(Feature.net_worth_liabilities);
    await assertLiabilityInBudget(liabilityId, workspace.budget.id);

    await prisma.$transaction(async (tx) => {
      await recalculateLiabilityBalance(tx, liabilityId);
      await recalculateEscrowBalance(tx, liabilityId);
    });

    revalidate();
    revalidatePath(`/net-worth/liabilities/${liabilityId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
