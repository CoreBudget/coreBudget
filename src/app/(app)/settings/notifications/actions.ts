"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth/guards";

export interface FormResult {
  error?: string;
}

function revalidate() {
  revalidatePath("/settings/notifications");
}

const updateSchema = z.object({
  notificationType: z.enum(NotificationType, "settings.notifications.errors.invalidType"),
  field: z.enum(["inAppEnabled", "pushEnabled"], "settings.notifications.errors.invalidField"),
  value: z.boolean(),
});

export async function setNotificationPreferenceAction(
  notificationType: string,
  field: "inAppEnabled" | "pushEnabled",
  value: boolean,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = updateSchema.safeParse({ notificationType, field, value });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.notificationPreference.upsert({
    where: {
      userId_notificationType: {
        userId: user.id,
        notificationType: parsed.data.notificationType,
      },
    },
    create: {
      userId: user.id,
      notificationType: parsed.data.notificationType,
      inAppEnabled: parsed.data.field === "inAppEnabled" ? parsed.data.value : true,
      pushEnabled: parsed.data.field === "pushEnabled" ? parsed.data.value : false,
    },
    update: { [parsed.data.field]: parsed.data.value },
  });
  revalidate();
  return {};
}
