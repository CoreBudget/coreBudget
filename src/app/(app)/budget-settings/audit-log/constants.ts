export const AUDIT_LOG_PAGE_SIZE_OPTIONS = [25, 50, 75, 100];

export interface AuditLogEntryRow {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
}
