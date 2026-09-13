import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform";
import { getPagePreference } from "@/lib/pagePreferences";
import BackupsPanel from "./BackupsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.backups.metaTitle") };
}

export default async function BackupsPage() {
  const admin = await requireAdmin();
  const [settings, backups, rowsPerPage] = await Promise.all([
    getPlatformSettings(),
    prisma.backup.findMany({ orderBy: { startedAt: "desc" } }),
    getPagePreference(admin.id, "adminBackups"),
  ]);

  return (
    <BackupsPanel
      autoBackupEnabled={settings.backupEnabled}
      initialRowsPerPage={rowsPerPage}
      backups={backups.map((b) => ({
        id: b.id,
        startedAt: b.startedAt.toISOString(),
        type: b.type,
        status: b.status,
        sizeBytes: b.sizeBytes,
        errorMessage: b.errorMessage,
      }))}
    />
  );
}
