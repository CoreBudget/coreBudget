"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export async function markTourSeenAction(tourId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session || session.user.seenTours.includes(tourId)) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { seenTours: { push: tourId } },
  });
}
