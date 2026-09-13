import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/workspace";
import { getPagePreference } from "@/lib/pagePreferences";
import AuditLogPanel from "./AuditLogPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("budgetSettings.auditLog.metaTitle") };
}

export default async function AuditLogSettingsPage() {
  const { user, workspace } = await requireFeature(Feature.audit_log);
  const rowsPerPage = await getPagePreference(user.id, "auditLog");

  const [entries, totalCount] = await Promise.all([
    prisma.auditLogEntry.findMany({
      where: { budgetId: workspace.budget.id },
      orderBy: { createdAt: "desc" },
      take: rowsPerPage,
      include: { user: { select: { name: true } } },
    }),
    prisma.auditLogEntry.count({ where: { budgetId: workspace.budget.id } }),
  ]);

  return (
    <AuditLogPanel
      timezone={user.timezone}
      dateFormatPreference={user.dateFormatPreference}
      totalCount={totalCount}
      initialRowsPerPage={rowsPerPage}
      entries={entries.map((e) => ({
        id: e.id,
        actorName: e.user.name,
        action: e.action,
        entityType: e.entityType,
        summary: e.summary,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}
