import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import { encrypt, decrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

export async function generateAndStoreVapidKeys(): Promise<string> {
  const { publicKey, privateKey } = webpush.generateVAPIDKeys();
  const settings = await getPlatformSettings();
  await prisma.$transaction([
    prisma.platformSettings.update({
      where: { id: settings.id },
      data: { vapidPublicKey: publicKey, vapidPrivateKeyEncrypted: encrypt(privateKey) },
    }),
    prisma.pushSubscription.deleteMany({}),
  ]);
  return publicKey;
}

interface PushSubscriptionTarget {
  id: string;
  endpoint: string;
  keysP256dh: string;
  keysAuth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export async function sendPushNotification(
  subscription: PushSubscriptionTarget,
  payload: PushPayload,
): Promise<{ sent: boolean }> {
  const settings = await getPlatformSettings();
  if (!settings.vapidPublicKey || !settings.vapidPrivateKeyEncrypted) {
    logger.warn("VAPID keys are not configured, push notification not sent");
    return { sent: false };
  }

  try {
    webpush.setVapidDetails(
      "mailto:admin@localhost",
      settings.vapidPublicKey,
      decrypt(settings.vapidPrivateKeyEncrypted),
    );
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keysP256dh, auth: subscription.keysAuth },
      },
      JSON.stringify(payload),
    );
    return { sent: true };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
    } else {
      logger.warn({ error }, "Push notification failed to send");
    }
    return { sent: false };
  }
}
