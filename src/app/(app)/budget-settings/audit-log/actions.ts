"use server";

import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import type { AuditLogEntryRow } from "./constants";

export async function fetchAuditLogPageAction(
  page: number,
  pageSize: number,
): Promise<AuditLogEntryRow[]> {
  const { workspace } = await requireFeature(Feature.audit_log);

  const entries = await prisma.auditLogEntry.findMany({
    where: { budgetId: workspace.budget.id },
    orderBy: { createdAt: "desc" },
    skip: page * pageSize,
    take: pageSize,
    include: { user: { select: { name: true } } },
  });

  return entries.map((e) => ({
    id: e.id,
    actorName: e.user.name,
    action: e.action,
    entityType: e.entityType,
    summary: e.summary,
    createdAt: e.createdAt.toISOString(),
  }));
}
