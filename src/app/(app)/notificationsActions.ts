"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { resolveCurrentWorkspace } from "@/lib/workspace";
import { syncNotificationsForUser } from "@/lib/notifications";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
}

function toRow(n: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: Date;
  readAt: Date | null;
  archivedAt: Date | null;
}): NotificationRow {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    archivedAt: n.archivedAt?.toISOString() ?? null,
  };
}

export async function getNotificationsAction(): Promise<{
  items: NotificationRow[];
  unreadCount: number;
}> {
  const user = await requireUser();
  const workspace = await resolveCurrentWorkspace(user.id);
  if (!workspace) return { items: [], unreadCount: 0 };

  await syncNotificationsForUser(user.id, workspace.budget.id, user.locale);

  const rows = await prisma.notification.findMany({
    where: { userId: user.id, readAt: null, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return { items: rows.map(toRow), unreadCount: rows.length };
}

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { readAt: new Date() },
  });
}

export async function archiveNotificationAction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { archivedAt: new Date() },
  });
}

export async function archiveAllNotificationsAction(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { archivedAt: new Date() },
  });
}

export async function deleteNotificationAction(id: string): Promise<void> {
  const user = await requireUser();
  await prisma.notification.deleteMany({ where: { id, userId: user.id } });
}

const HISTORY_PAGE_SIZE = 30;

export async function getNotificationHistoryAction(cursor?: string): Promise<{
  items: NotificationRow[];
  nextCursor: string | null;
}> {
  const user = await requireUser();
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > HISTORY_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;
  return { items: page.map(toRow), nextCursor: hasMore ? page[page.length - 1].id : null };
}
