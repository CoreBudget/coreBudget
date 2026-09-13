import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import NotificationSettingsPanel from "./NotificationSettingsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.notifications.metaTitle") };
}

export default async function NotificationSettingsPage() {
  const user = await requireUser();

  const rows = await prisma.notificationPreference.findMany({ where: { userId: user.id } });
  const byType = new Map(rows.map((r) => [r.notificationType, r]));

  const preferences = Object.values(NotificationType).map((type) => {
    const existing = byType.get(type);
    return {
      notificationType: type,
      inAppEnabled: existing?.inAppEnabled ?? true,
      pushEnabled: existing?.pushEnabled ?? false,
    };
  });

  return <NotificationSettingsPanel preferences={preferences} />;
}
