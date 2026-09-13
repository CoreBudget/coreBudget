import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { getGoalProgressReport } from "../reportQueries";
import GoalProgressReportView from "./GoalProgressReportView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("reports.goalProgress.metaTitle") };
}

export default async function GoalProgressReportPage() {
  const { user, workspace } = await requireFeature(Feature.reports);
  const settings = await getPlatformSettings();
  const data = await getGoalProgressReport(workspace.budget.id);

  return (
    <GoalProgressReportView data={data} locale={user.locale} currencyCode={settings.currencyCode} />
  );
}
