"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";

export async function revokeSessionAction(sessionId: string): Promise<void> {
  await requireAdmin();
  await prisma.userSession.update({ where: { id: sessionId }, data: { revoked: true } });
}
