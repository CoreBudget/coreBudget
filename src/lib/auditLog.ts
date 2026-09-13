import "server-only";
import { prisma } from "@/lib/prisma";
import { AuditAction, Feature } from "@/generated/prisma/client";
import { getPlatformFeatureToggles } from "@/lib/platformFeatures";

export async function logAudit({
  budgetId,
  userId,
  action,
  entityType,
  entityId,
  summary,
}: {
  budgetId?: string | null;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
}): Promise<void> {
  try {
    const toggles = await getPlatformFeatureToggles();
    if (!toggles[Feature.audit_log]) return;

    await prisma.auditLogEntry.create({
      data: { budgetId, userId, action, entityType, entityId, summary },
    });
  } catch (err) {
    console.error("logAudit failed", { entityType, entityId, action }, err);
  }
}
