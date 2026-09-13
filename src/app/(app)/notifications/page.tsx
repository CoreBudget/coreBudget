import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { getNotificationHistoryAction } from "../notificationsActions";
import NotificationsPanel from "./NotificationsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("notifications.page.metaTitle") };
}

export default async function NotificationsPage() {
  await requireUser();
  const { items, nextCursor } = await getNotificationHistoryAction();

  return <NotificationsPanel initialItems={items} initialCursor={nextCursor} />;
}
