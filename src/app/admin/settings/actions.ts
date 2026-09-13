"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { encrypt } from "@/lib/crypto";
import { getPlatformSettings } from "@/lib/platform";
import { generateAndStoreVapidKeys } from "@/lib/pushService";

export interface FormResult {
  error?: string;
  message?: string;
}

const localizationSchema = z.object({
  defaultLocale: z.string().min(1),
  currencyCode: z.string().length(3),
  sessionTimeoutMinutes: z.coerce.number().int().positive(),
});

export async function updateLocalizationAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const parsed = localizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const settings = await getPlatformSettings();
  await prisma.platformSettings.update({ where: { id: settings.id }, data: parsed.data });

  return { message: "admin.settings.messages.saved" };
}

const smtpSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().positive().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromAddress: z.string().optional(),
});

export async function updateSmtpAction(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const parsed = smtpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const settings = await getPlatformSettings();
  await prisma.platformSettings.update({
    where: { id: settings.id },
    data: {
      smtpHost: parsed.data.smtpHost || null,
      smtpPort: parsed.data.smtpPort ?? null,
      smtpUser: parsed.data.smtpUser || null,
      smtpFromAddress: parsed.data.smtpFromAddress || null,
      ...(parsed.data.smtpPassword
        ? { smtpPasswordEncrypted: encrypt(parsed.data.smtpPassword) }
        : {}),
    },
  });

  return { message: "admin.settings.messages.saved" };
}

export async function regenerateVapidKeysAction(): Promise<FormResult & { publicKey?: string }> {
  await requireAdmin();
  const publicKey = await generateAndStoreVapidKeys();
  return { message: "admin.settings.webPush.regenerated", publicKey };
}
