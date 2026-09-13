"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { verifyTotpToken } from "@/lib/auth/totp";
import { createSession, getCurrentSession } from "@/lib/auth/session";
import { grantFullBudgetAccess } from "@/lib/permissions";
import { applyDefaultBudgetTemplate } from "@/lib/budgetTemplate";
import { createInvite } from "@/lib/auth/invite";
import { AccountType } from "@/generated/prisma/client";
import type { SetupActionState } from "./state";

async function requireAdmin() {
  const session = await getCurrentSession();
  if (!session) throw new Error("setup.shared.errors.notSignedIn");
  return session.user;
}

const adminAccountSchema = z
  .object({
    name: z.string().min(1, "setup.adminAccount.errors.nameRequired"),
    email: z.string().email(),
    password: z.string().min(8, "setup.adminAccount.errors.passwordMinLength"),
    confirmPassword: z.string(),
    secret: z.string().min(1),
    code: z.string().regex(/^\d{6}$/, "setup.adminAccount.errors.codeFormat"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "setup.adminAccount.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

export async function createAdminAccount(
  _prev: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  if ((await prisma.user.count()) > 0) {
    return { error: "setup.adminAccount.errors.alreadyCompleted" };
  }

  const parsed = adminAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const validCode = await verifyTotpToken(parsed.data.secret, parsed.data.code);
  if (!validCode) {
    return { error: "setup.adminAccount.errors.incorrectCode" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      twoFactorSecret: parsed.data.secret,
      twoFactorEnabled: true,
      isAdmin: true,
      status: "active",
    },
  });

  await createSession(user.id);
  redirect("/setup");
}

const householdSchema = z.object({
  name: z.string().min(1, "setup.household.errors.nameRequired"),
});

export async function createHouseholdStep(
  _prev: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  const admin = await requireAdmin();
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const household = await prisma.household.create({ data: { name: parsed.data.name } });
  await prisma.householdAccess.create({
    data: { userId: admin.id, householdId: household.id, role: "owner" },
  });

  redirect("/setup");
}

const budgetSchema = z.object({ name: z.string().min(1, "setup.budget.errors.nameRequired") });

export async function createBudgetStep(
  _prev: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  const admin = await requireAdmin();
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const household = await prisma.household.findFirst();
  if (!household) return { error: "setup.budget.errors.noHousehold" };

  const budget = await prisma.budget.create({
    data: { householdId: household.id, name: parsed.data.name },
  });
  await grantFullBudgetAccess(admin.id, budget.id);
  await applyDefaultBudgetTemplate(budget.id);

  redirect("/setup");
}

const accountSchema = z.object({
  name: z.string().min(1, "setup.account.errors.nameRequired"),
  type: z.enum(AccountType),
  startingBalance: z.coerce.number().finite().default(0),
});

export async function createAccountStep(
  _prev: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  await requireAdmin();
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const budget = await prisma.budget.findFirst();
  if (!budget) return { error: "setup.account.errors.noBudget" };

  const startingBalance = parsed.data.startingBalance;
  const account = await prisma.account.create({
    data: {
      budgetId: budget.id,
      name: parsed.data.name,
      type: parsed.data.type,
      balance: startingBalance,
      clearedBalance: startingBalance,
      unclearedBalance: 0,
    },
  });

  if (startingBalance !== 0) {
    const t = await getTranslations();
    const startingBalanceLabel = t("accounts.startingBalanceTransactionLabel");
    const startingBalancePayee =
      (await prisma.payee.findFirst({ where: { name: startingBalanceLabel } })) ??
      (await prisma.payee.create({ data: { name: startingBalanceLabel, includeInList: false } }));

    await prisma.transaction.create({
      data: {
        accountId: account.id,
        postDate: new Date(),
        payeeId: startingBalancePayee.id,
        memo: startingBalanceLabel,
        credit: startingBalance > 0 ? startingBalance : null,
        debit: startingBalance < 0 ? Math.abs(startingBalance) : null,
        runningBalance: startingBalance,
        cleared: true,
        pendingApproval: false,
      },
    });
  }

  redirect("/setup");
}

const inviteSchema = z.object({
  name: z.string().min(1, "setup.invite.errors.nameRequired"),
  email: z.string().email(),
});

export async function inviteMemberStep(
  _prev: SetupActionState,
  formData: FormData,
): Promise<SetupActionState> {
  const admin = await requireAdmin();
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const household = await prisma.household.findFirst();
  if (!household) return { error: "setup.invite.errors.noHousehold" };

  const { acceptUrl, emailSent } = await createInvite({
    email: parsed.data.email,
    name: parsed.data.name,
    invitedByUserId: admin.id,
  });

  const invitedUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (invitedUser) {
    await prisma.householdAccess.upsert({
      where: { userId_householdId: { userId: invitedUser.id, householdId: household.id } },
      create: { userId: invitedUser.id, householdId: household.id, role: "member" },
      update: {},
    });
  }

  return emailSent
    ? {}
    : {
        error: JSON.stringify({
          key: "setup.invite.errors.smtpNotConfigured",
          params: { acceptUrl },
        }),
      };
}

export async function finishSetup(): Promise<void> {
  await requireAdmin();
  redirect("/dashboard");
}
