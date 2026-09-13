import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function recordJobRun(
  jobName: string,
  run: () => Promise<string | void>,
): Promise<void> {
  const { id } = await prisma.jobRun.create({ data: { jobName } });
  try {
    const detail = (await run()) ?? null;
    await prisma.jobRun.update({
      where: { id },
      data: { status: "completed", completedAt: new Date(), detail },
    });
  } catch (err) {
    logger.error({ err, jobName }, "Scheduled job failed");
    await prisma.jobRun.update({
      where: { id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
