"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import type { ScheduledJobStatus } from "@/lib/scheduledJobs";
import ScheduledJobsPanel from "./ScheduledJobsPanel";
import JobHistory, { type JobRunRow } from "./JobHistory";
import ErrorLogPanel, { type ErrorLogRow } from "./ErrorLogPanel";

export default function HealthTabs({
  scheduledJobs,
  jobRuns,
  jobRunsInitialRowsPerPage,
  errorLogs,
  errorLogInitialRowsPerPage,
}: {
  scheduledJobs: ScheduledJobStatus[];
  jobRuns: JobRunRow[];
  jobRunsInitialRowsPerPage: number;
  errorLogs: ErrorLogRow[];
  errorLogInitialRowsPerPage: number;
}) {
  const tokens = useTokens();
  const t = useTranslations();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ mt: "28px" }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ minHeight: 42, mb: "16px" }}
        style={{ borderBottom: `1px solid ${tokens.border}` }}
      >
        <Tab sx={{ minHeight: 42 }} label={t("admin.health.scheduledJobs.title")} />
        <Tab sx={{ minHeight: 42 }} label={t("admin.health.jobHistory.title")} />
        <Tab sx={{ minHeight: 42 }} label={t("admin.health.errorLog.title")} />
      </Tabs>

      {tab === 0 && <ScheduledJobsPanel jobs={scheduledJobs} />}
      {tab === 1 && <JobHistory runs={jobRuns} initialRowsPerPage={jobRunsInitialRowsPerPage} />}
      {tab === 2 && (
        <ErrorLogPanel errors={errorLogs} initialRowsPerPage={errorLogInitialRowsPerPage} />
      )}
    </Box>
  );
}
