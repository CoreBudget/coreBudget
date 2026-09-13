"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function updateThemeModeAction(mode: "light" | "dark"): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { themeMode: mode } });
}
