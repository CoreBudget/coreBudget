"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useTokens } from "@/theme";
import { td } from "@/lib/i18n/translateDynamicKey";
import type { ScheduledJobStatus } from "@/lib/scheduledJobs";
import { JOB_LABEL_KEYS } from "./JobHistory";

const CADENCE_KEYS: Record<string, string> = {
  "0 3 * * *": "admin.health.scheduledJobs.cadence.dailyAt3am",
  "0 * * * *": "admin.health.scheduledJobs.cadence.hourly",
  "0 4 * * *": "admin.health.scheduledJobs.cadence.dailyAt4am",
  "30 4 * * *": "admin.health.scheduledJobs.cadence.dailyAt430am",
  "0 6 * * *": "admin.health.scheduledJobs.cadence.dailyAt6am",
  "0 0 1 * *": "admin.health.scheduledJobs.cadence.monthlyFirst",
  "*/15 * * * *": "admin.health.scheduledJobs.cadence.every15Minutes",
};

export default function ScheduledJobsPanel({ jobs }: { jobs: ScheduledJobStatus[] }) {
  const tokens = useTokens();
  const t = useTranslations();

  const statusColor: Record<NonNullable<ScheduledJobStatus["lastRunStatus"]>, string> = {
    completed: tokens.green,
    failed: tokens.red,
    running: tokens.blue,
  };
  const statusLabel: Record<NonNullable<ScheduledJobStatus["lastRunStatus"]>, string> = {
    completed: t("admin.health.status.completed"),
    failed: t("admin.health.status.failed"),
    running: t("admin.health.status.running"),
  };

  return (
    <Box>
      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: "10px", overflow: "hidden" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("admin.health.scheduledJobs.columns.job")}</TableCell>
              <TableCell>{t("admin.health.scheduledJobs.columns.cadence")}</TableCell>
              <TableCell>{t("admin.health.scheduledJobs.columns.lastRun")}</TableCell>
              <TableCell>{t("admin.health.scheduledJobs.columns.result")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.jobName}>
                <TableCell sx={{ fontSize: 12.5 }}>
                  <Stack sx={{ gap: "2px" }}>
                    <Typography
                      sx={{ fontSize: 12.5, fontWeight: 500 }}
                      style={{ color: tokens.textBody }}
                    >
                      {JOB_LABEL_KEYS[job.jobName]
                        ? td(t, JOB_LABEL_KEYS[job.jobName])
                        : job.jobName}
                    </Typography>
                    {job.inactiveReason && (
                      <Typography
                        sx={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}
                        style={{ color: tokens.amber }}
                      >
                        {td(t, `admin.health.scheduledJobs.inactiveReasons.${job.inactiveReason}`)}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                  {CADENCE_KEYS[job.cronExpression]
                    ? td(t, CADENCE_KEYS[job.cronExpression])
                    : job.cronExpression}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }} style={{ color: tokens.textMuted }}>
                  {job.lastRunAt
                    ? new Date(job.lastRunAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : t("admin.health.scheduledJobs.neverRun")}
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {job.lastRunStatus ? (
                    <Stack sx={{ gap: "2px" }}>
                      <Typography
                        sx={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase" }}
                        style={{ color: statusColor[job.lastRunStatus] }}
                      >
                        {statusLabel[job.lastRunStatus]}
                      </Typography>
                      {job.lastRunDetail && (
                        <Typography sx={{ fontSize: 11 }} style={{ color: tokens.textFaint }}>
                          {job.lastRunDetail}
                        </Typography>
                      )}
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: 12 }} style={{ color: tokens.textFaint }}>
                      -
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
