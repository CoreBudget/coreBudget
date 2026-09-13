import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { getDebtPayoffReport } from "../reportQueries";
import DebtPayoffReportView from "./DebtPayoffReportView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("reports.debtPayoff.metaTitle") };
}

export default async function DebtPayoffReportPage() {
  const { user, workspace } = await requireFeature(Feature.reports);
  const settings = await getPlatformSettings();
  const data = await getDebtPayoffReport(workspace.budget.id);

  return (
    <DebtPayoffReportView data={data} locale={user.locale} currencyCode={settings.currencyCode} />
  );
}
