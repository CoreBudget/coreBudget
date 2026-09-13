import "server-only";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";
import { getPlatformFeatureToggles } from "@/lib/platformFeatures";
import { getPlatformSettings } from "@/lib/platform";

export interface ScheduledJobStatus {
  jobName: string;
  cronExpression: string;
  lastRunAt: string | null;
  lastRunStatus: "running" | "completed" | "failed" | null;
  lastRunDetail: string | null;
  inactiveReason: "feature_disabled" | "backups_disabled" | null;
}

interface JobDefinition {
  jobName: string;
  relatedJobNames: string[];
  cronExpression: string;
  feature: Feature | null;
}

const JOB_DEFINITIONS: JobDefinition[] = [
  {
    jobName: "automatic_backup",
    relatedJobNames: ["automatic_backup"],
    cronExpression: "0 3 * * *",
    feature: null,
  },
  {
    jobName: "session_cleanup",
    relatedJobNames: ["session_cleanup"],
    cronExpression: "0 * * * *",
    feature: null,
  },
  {
    jobName: "audit_log_retention",
    relatedJobNames: ["audit_log_retention"],
    cronExpression: "0 4 * * *",
    feature: Feature.audit_log,
  },
  {
    jobName: "error_log_retention",
    relatedJobNames: ["error_log_retention"],
    cronExpression: "30 4 * * *",
    feature: null,
  },
  {
    jobName: "process_due_repeating_transactions",
    relatedJobNames: ["process_due_repeating_transactions"],
    cronExpression: "0 6 * * *",
    feature: Feature.repeating_transactions,
  },
  {
    jobName: "category_plan_snapshot",
    relatedJobNames: ["category_plan_snapshot", "category_plan_snapshot_startup_check"],
    cronExpression: "0 0 1 * *",
    feature: Feature.plan,
  },
  {
    jobName: "send_push_notifications",
    relatedJobNames: ["send_push_notifications"],
    cronExpression: "*/15 * * * *",
    feature: null,
  },
];

export async function getScheduledJobsStatus(): Promise<ScheduledJobStatus[]> {
  const [toggles, settings] = await Promise.all([
    getPlatformFeatureToggles(),
    getPlatformSettings(),
  ]);

  return Promise.all(
    JOB_DEFINITIONS.map(async (def): Promise<ScheduledJobStatus> => {
      const latest = await prisma.jobRun.findFirst({
        where: { jobName: { in: def.relatedJobNames } },
        orderBy: { startedAt: "desc" },
      });

      let inactiveReason: ScheduledJobStatus["inactiveReason"] = null;
      if (def.jobName === "automatic_backup" && !settings.backupEnabled) {
        inactiveReason = "backups_disabled";
      } else if (def.feature && !toggles[def.feature]) {
        inactiveReason = "feature_disabled";
      }

      return {
        jobName: def.jobName,
        cronExpression: def.cronExpression,
        lastRunAt: latest?.startedAt.toISOString() ?? null,
        lastRunStatus: latest?.status ?? null,
        lastRunDetail:
          latest?.status === "failed" ? (latest.errorMessage ?? null) : (latest?.detail ?? null),
        inactiveReason,
      };
    }),
  );
}
