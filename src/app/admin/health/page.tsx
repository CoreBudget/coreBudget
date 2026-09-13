import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { td } from "@/lib/i18n/translateDynamicKey";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform";
import { getActiveSessionCount, getDatabaseHealth } from "@/lib/health";
import { getPagePreference } from "@/lib/pagePreferences";
import { getScheduledJobsStatus } from "@/lib/scheduledJobs";
import HealthCards from "./HealthCards";
import HealthTabs from "./HealthTabs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.health.metaTitle") };
}

const JOB_RUNS_FETCH_LIMIT = 200;
const ERROR_LOG_FETCH_LIMIT = 200;

type Translate = Awaited<ReturnType<typeof getTranslations>>;

function formatUptime(seconds: number, t: Translate): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days === 0) {
    return td(t, "admin.health.uptimeHours", { hours });
  }
  return td(t, "admin.health.uptimeDaysHours", { days, hours });
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB`;
}

export default async function HealthPage() {
  const admin = await requireAdmin();
  const t = await getTranslations();
  const settings = await getPlatformSettings();

  const [
    { latencyMs, sizeBytes },
    activeSessionCount,
    jobRuns,
    scheduledJobs,
    rowsPerPage,
    errorLogs,
    errorLogRowsPerPage,
  ] = await Promise.all([
    getDatabaseHealth(),
    getActiveSessionCount(settings.sessionTimeoutMinutes),
    prisma.jobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: JOB_RUNS_FETCH_LIMIT,
    }),
    getScheduledJobsStatus(),
    getPagePreference(admin.id, "adminJobHistory"),
    prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: ERROR_LOG_FETCH_LIMIT,
    }),
    getPagePreference(admin.id, "adminErrorLog"),
  ]);

  return (
    <>
      <HealthCards
        title={t("admin.health.title")}
        subtitle={t("admin.health.subtitle")}
        cards={[
          {
            label: t("admin.health.cards.appStatus"),
            value: t("admin.health.appStatusHealthy"),
            tone: "success",
          },
          {
            label: t("admin.health.cards.database"),
            value: t("admin.health.databaseConnected", { ms: latencyMs }),
            tone: "success",
          },
          {
            label: t("admin.health.cards.storage"),
            value: formatBytes(sizeBytes),
            tone: "info",
          },
          {
            label: t("admin.health.cards.uptime"),
            value: formatUptime(process.uptime(), t),
            tone: "neutral",
          },
          {
            label: t("admin.health.cards.activeSessions"),
            value: String(activeSessionCount),
            tone: "neutral",
          },
        ]}
      />
      <HealthTabs
        scheduledJobs={scheduledJobs}
        jobRunsInitialRowsPerPage={rowsPerPage}
        jobRuns={jobRuns.map((r) => ({
          id: r.id,
          jobName: r.jobName,
          startedAt: r.startedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
          status: r.status,
          detail: r.detail,
          errorMessage: r.errorMessage,
        }))}
        errorLogInitialRowsPerPage={errorLogRowsPerPage}
        errorLogs={errorLogs.map((e) => ({
          id: e.id,
          source: e.source,
          message: e.message,
          stack: e.stack,
          path: e.path,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
