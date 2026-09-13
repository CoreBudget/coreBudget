"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { verifyTotpToken } from "@/lib/auth/totp";

export interface AcceptInviteState {
  error?: string;
}

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "auth.shared.errors.passwordMinLength"),
    confirmPassword: z.string(),
    code: z.string().regex(/^\d{6}$/, "auth.shared.errors.enterCode"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.shared.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

export async function acceptInvite(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const invite = await prisma.userInvite.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return { error: "auth.invite.errors.invalidToken" };
  }

  const user = await prisma.user.findUnique({ where: { email: invite.email } });
  if (!user || user.status !== "invited" || !user.twoFactorSecret) {
    return { error: "auth.invite.errors.invalidToken" };
  }

  const validCode = await verifyTotpToken(user.twoFactorSecret, parsed.data.code);
  if (!validCode) {
    return { error: "auth.shared.errors.incorrectCode" };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, twoFactorEnabled: true, status: "active" },
    }),
    prisma.userInvite.update({ where: { id: invite.id }, data: { status: "accepted" } }),
  ]);

  redirect("/login");
}
