"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createTotpSecret, totpKeyUri, verifyTotpToken } from "@/lib/auth/totp";
import {
  clearPendingLogin,
  createSession,
  getPendingLoginUserId,
  setPendingLogin,
} from "@/lib/auth/session";
import { isDeviceTrusted, trustThisDevice } from "@/lib/auth/deviceTrust";

function redirectTarget(formData: FormData): string {
  const next = formData.get("next");
  return typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
}

export interface LoginActionState {
  step: "credentials" | "totp" | "enroll";
  error?: string;
  enrollSecret?: string;
  enrollQrDataUrl?: string;
}

async function recordLoginHistory(
  userId: string,
  result: "success" | "failed_password" | "failed_2fa",
) {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
  await prisma.loginHistoryEntry.create({
    data: { userId, result, ipAddress, device: h.get("user-agent") ?? undefined },
  });
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function submitCredentials(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { step: "credentials", error: "auth.login.errors.invalidCredentialsInput" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const genericError = {
    step: "credentials" as const,
    error: "auth.login.errors.incorrectCredentials",
  };

  if (!user || user.status !== "active" || !user.passwordHash) {
    if (user) await recordLoginHistory(user.id, "failed_password");
    return genericError;
  }

  const validPassword = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!validPassword) {
    await recordLoginHistory(user.id, "failed_password");
    return genericError;
  }

  if (!user.twoFactorEnabled) {
    const secret = createTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
    await setPendingLogin(user.id);
    const qrDataUrl = await QRCode.toDataURL(totpKeyUri(secret, user.email));
    return { step: "enroll", enrollSecret: secret, enrollQrDataUrl: qrDataUrl };
  }

  if (await isDeviceTrusted(user.id)) {
    await recordLoginHistory(user.id, "success");
    await createSession(user.id);
    redirect(redirectTarget(formData));
  }

  await setPendingLogin(user.id);
  return { step: "totp" };
}

const totpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "auth.shared.errors.enterCode"),
});

export async function submitTotp(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const pendingUserId = await getPendingLoginUserId();
  if (!pendingUserId) {
    return { step: "credentials", error: "auth.login.errors.sessionExpired" };
  }

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { step: "totp", error: parsed.error.issues[0]?.message };
  }

  const user = await prisma.user.findUnique({ where: { id: pendingUserId } });
  if (!user || user.status !== "active" || !user.twoFactorSecret) {
    await clearPendingLogin();
    return { step: "credentials", error: "auth.login.errors.signInAgain" };
  }

  const valid = await verifyTotpToken(user.twoFactorSecret, parsed.data.code);
  if (!valid) {
    await recordLoginHistory(user.id, "failed_2fa");
    return { step: "totp", error: "auth.shared.errors.incorrectCode" };
  }

  await recordLoginHistory(user.id, "success");
  await createSession(user.id);
  if (formData.get("rememberDevice") === "on") {
    await trustThisDevice(user.id);
  }

  redirect(redirectTarget(formData));
}

export async function submitEnroll(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const pendingUserId = await getPendingLoginUserId();
  if (!pendingUserId) {
    return { step: "credentials", error: "auth.login.errors.sessionExpired" };
  }

  const user = await prisma.user.findUnique({ where: { id: pendingUserId } });
  if (!user || user.status !== "active" || !user.twoFactorSecret) {
    await clearPendingLogin();
    return { step: "credentials", error: "auth.login.errors.signInAgain" };
  }

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    const qrDataUrl = await QRCode.toDataURL(totpKeyUri(user.twoFactorSecret, user.email));
    return {
      step: "enroll",
      error: parsed.error.issues[0]?.message,
      enrollSecret: user.twoFactorSecret,
      enrollQrDataUrl: qrDataUrl,
    };
  }

  const valid = await verifyTotpToken(user.twoFactorSecret, parsed.data.code);
  if (!valid) {
    const qrDataUrl = await QRCode.toDataURL(totpKeyUri(user.twoFactorSecret, user.email));
    return {
      step: "enroll",
      error: "auth.shared.errors.incorrectCode",
      enrollSecret: user.twoFactorSecret,
      enrollQrDataUrl: qrDataUrl,
    };
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await recordLoginHistory(user.id, "success");
  await createSession(user.id);
  if (formData.get("rememberDevice") === "on") {
    await trustThisDevice(user.id);
  }

  redirect(redirectTarget(formData));
}
