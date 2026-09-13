"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { isSidebarPageKey } from "@/lib/sidebarVisibilityKeys";

export async function updateSidebarGroupOpenAction(
  group: "accounts" | "netWorth",
  open: boolean,
): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: group === "accounts" ? { sidebarAccountsOpen: open } : { sidebarNetWorthOpen: open },
  });
}

export async function setSidebarPageVisibilityAction(
  pageKey: string,
  visible: boolean,
): Promise<{ error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { error: "common.errors.notAllowed" };
  if (!isSidebarPageKey(pageKey)) return { error: "settings.errors.invalidPageKey" };

  await prisma.userSidebarVisibilityPreference.upsert({
    where: { userId_pageKey: { userId: session.user.id, pageKey } },
    create: { userId: session.user.id, pageKey, visible },
    update: { visible },
  });
  return {};
}
