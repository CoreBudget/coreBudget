"use server";

import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { findOrCreatePayee } from "@/lib/transactions";
import { logAudit } from "@/lib/auditLog";

export interface FormResult {
  error?: string;
  accountId?: string;
}

const CASH_TYPES = ["checking", "savings", "cash", "investment"] as const;
const CREDIT_TYPES = ["credit", "line_credit"] as const;

const createAccountSchema = z.object({
  category: z.enum(["cash", "credit"]),
  type: z.enum([...CASH_TYPES, ...CREDIT_TYPES]),
  name: z.string().min(1, "accounts.errors.nameRequired"),
  startingBalance: z.coerce.number().finite().default(0),
  website: z.string().optional(),
  paymentDueDay: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.coerce.number().int().min(1).max(31).optional(),
  ),
  cardExpiration: z.string().optional(),
});

function parseCardExpiration(value: string | undefined): Date | null | undefined {
  if (!value || !value.trim()) return null;
  const match = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const month = Number(match[1]);
  const year = Number(match[2]);
  return new Date(year, month, 0);
}

export async function createAccountAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { user, workspace, level } = await requireFeature(Feature.transactions);
  if (level !== "edit") return { error: "accounts.errors.readOnly" };

  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  const { category, type, name, startingBalance, website, paymentDueDay, cardExpiration } =
    parsed.data;
  const validTypes = category === "cash" ? CASH_TYPES : CREDIT_TYPES;
  if (!(validTypes as readonly string[]).includes(type)) {
    return { error: "accounts.errors.invalidType" };
  }

  const cardExpirationDate = type === "credit" ? parseCardExpiration(cardExpiration) : null;
  if (cardExpirationDate === undefined) {
    return { error: "accounts.errors.invalidCardExpiration" };
  }

  const account = await prisma.account.create({
    data: {
      budgetId: workspace.budget.id,
      name,
      type,
      website: website?.trim() || null,
      balance: startingBalance,
      clearedBalance: startingBalance,
      unclearedBalance: 0,
      paymentDueDay: category === "credit" ? (paymentDueDay ?? null) : null,
      cardExpirationDate,
    },
  });

  if (startingBalance !== 0) {
    const t = await getTranslations();
    const startingBalanceLabel = t("accounts.startingBalanceTransactionLabel");
    const payeeId = await findOrCreatePayee(startingBalanceLabel);
    await prisma.transaction.create({
      data: {
        accountId: account.id,
        postDate: new Date(),
        payeeId,
        memo: startingBalanceLabel,
        credit: startingBalance > 0 ? startingBalance : null,
        debit: startingBalance < 0 ? Math.abs(startingBalance) : null,
        runningBalance: startingBalance,
        cleared: true,
        pendingApproval: false,
      },
    });
  }

  await logAudit({
    budgetId: workspace.budget.id,
    userId: user.id,
    action: "create",
    entityType: "Account",
    entityId: account.id,
    summary: `Created account '${account.name}'`,
  });

  return { accountId: account.id };
}
