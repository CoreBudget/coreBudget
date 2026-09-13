"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform";
import { runBackup } from "@/lib/backup";

export async function toggleAutoBackupAction(): Promise<void> {
  await requireAdmin();
  const settings = await getPlatformSettings();
  await prisma.platformSettings.update({
    where: { id: settings.id },
    data: { backupEnabled: !settings.backupEnabled },
  });
}

export async function runBackupNowAction(): Promise<void> {
  await requireAdmin();
  await runBackup("manual");
}

export async function retryBackupAction(failedBackupId: string): Promise<void> {
  await requireAdmin();
  const failed = await prisma.backup.findUniqueOrThrow({ where: { id: failedBackupId } });
  await runBackup(failed.type);
}

export async function deleteBackupAction(id: string): Promise<void> {
  await requireAdmin();
  const backup = await prisma.backup.findUniqueOrThrow({ where: { id } });
  if (backup.status !== "failed") return;
  await prisma.backup.delete({ where: { id } });
}

export async function clearFailedBackupsAction(): Promise<void> {
  await requireAdmin();
  await prisma.backup.deleteMany({ where: { status: "failed" } });
}
