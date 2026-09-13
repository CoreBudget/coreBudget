"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locale";
import { DATE_FORMAT_OPTIONS } from "@/lib/date";

export interface FormResult {
  error?: string;
}

function revalidate() {
  revalidatePath("/settings");
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "settings.errors.nameRequired"),
  email: z
    .string()
    .trim()
    .min(1, "settings.errors.emailRequired")
    .email("settings.errors.emailInvalid"),
});

export async function updateProfileAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== user.id) {
    return { error: "settings.errors.emailTaken" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, email: parsed.data.email },
  });
  revalidate();
  return {};
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "settings.errors.currentPasswordRequired"),
    newPassword: z.string().min(8, "auth.shared.errors.passwordMinLength"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "auth.shared.errors.passwordMismatch",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (
    !user.passwordHash ||
    !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))
  ) {
    return { error: "settings.errors.incorrectCurrentPassword" };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  revalidate();
  return {};
}

const resetTwoFactorSchema = z.object({
  currentPassword: z.string().min(1, "settings.errors.currentPasswordRequired"),
});

export async function resetTwoFactorAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = resetTwoFactorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (
    !user.passwordHash ||
    !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))
  ) {
    return { error: "settings.errors.incorrectCurrentPassword" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });
  revalidate();
  return {};
}

export async function revokeSessionAction(sessionId: string): Promise<FormResult> {
  const user = await requireUser();
  const current = await getCurrentSession();
  if (sessionId === current?.sessionId) {
    return { error: "settings.errors.cannotRevokeCurrentSession" };
  }

  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) {
    return { error: "settings.errors.sessionNotFound" };
  }

  await prisma.userSession.update({ where: { id: sessionId }, data: { revoked: true } });
  revalidate();
  return {};
}

const localizationSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES, "settings.errors.invalidLocale"),
  timezone: z.string().min(1, "settings.errors.invalidTimezone"),
  dateFormatPreference: z.enum(DATE_FORMAT_OPTIONS, "settings.errors.invalidDateFormat"),
});

export async function updateLocalizationAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = localizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let supportedZones: readonly string[];
  try {
    supportedZones = Intl.supportedValuesOf("timeZone");
  } catch {
    supportedZones = [];
  }
  if (supportedZones.length > 0 && !supportedZones.includes(parsed.data.timezone)) {
    return { error: "settings.errors.invalidTimezone" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
      dateFormatPreference: parsed.data.dateFormatPreference,
    },
  });
  revalidate();
  return {};
}
