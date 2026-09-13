"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { createInvite } from "@/lib/auth/invite";
import { createPasswordReset } from "@/lib/auth/passwordReset";

const createUserSchema = z.object({
  name: z.string().min(1, "admin.users.errors.nameRequired"),
  email: z.string().email(),
});

export interface CreateUserResult {
  error?: string;
  message?: string;
}

export async function createUserAction(
  _prev: CreateUserResult,
  formData: FormData,
): Promise<CreateUserResult> {
  const admin = await requireAdmin();
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "admin.users.errors.emailInUse" };
  }

  const { acceptUrl, emailSent } = await createInvite({
    email: parsed.data.email,
    name: parsed.data.name,
    invitedByUserId: admin.id,
  });

  return emailSent
    ? { message: "admin.users.messages.inviteSent" }
    : {
        message: JSON.stringify({
          key: "admin.users.messages.smtpNotConfiguredShareLink",
          params: { acceptUrl },
        }),
      };
}

export async function resetPasswordAction(
  userId: string,
): Promise<{ emailSent: boolean; resetUrl: string }> {
  await requireAdmin();
  return createPasswordReset(userId);
}

export async function resetTwoFactorAction(userId: string): Promise<void> {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });
}

export async function toggleUserStatusAction(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) {
    throw new Error("admin.users.errors.cannotDeactivateSelf");
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.status !== "active" && user.status !== "deactivated") {
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { status: user.status === "active" ? "deactivated" : "active" },
  });
}
