"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform";

export async function getVapidPublicKeyAction(): Promise<string | null> {
  const settings = await getPlatformSettings();
  return settings.vapidPublicKey;
}

export async function savePushSubscriptionAction(
  endpoint: string,
  keysP256dh: string,
  keysAuth: string,
  deviceLabel?: string,
): Promise<void> {
  const user = await requireUser();
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, keysP256dh, keysAuth, deviceLabel },
    update: { userId: user.id, keysP256dh, keysAuth, deviceLabel },
  });
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<void> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
