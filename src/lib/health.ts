import "server-only";
import { prisma } from "@/lib/prisma";

export async function getDatabaseHealth(): Promise<{ latencyMs: number; sizeBytes: number }> {
  const start = Date.now();
  const [result] = await prisma.$queryRaw<{ size: bigint }[]>`
    SELECT pg_database_size(current_database()) AS size
  `;
  const latencyMs = Date.now() - start;
  return { latencyMs, sizeBytes: Number(result.size) };
}

export async function getActiveSessionCount(sessionTimeoutMinutes: number): Promise<number> {
  const cutoff = new Date(Date.now() - sessionTimeoutMinutes * 60_000);
  return prisma.userSession.count({
    where: { revoked: false, lastActiveAt: { gte: cutoff } },
  });
}
