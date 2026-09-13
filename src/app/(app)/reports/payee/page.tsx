import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { getPayeeReport, reportYearOptions } from "../reportQueries";
import PayeeReportView from "./PayeeReportView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("reports.payee.metaTitle") };
}

export default async function PayeeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { user, workspace } = await requireFeature(Feature.reports);
  const settings = await getPlatformSettings();
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getUTCFullYear();
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const year = Number.isInteger(parsedYear) ? parsedYear : currentYear;

  const data = await getPayeeReport(workspace.budget.id, year);

  return (
    <PayeeReportView
      data={data}
      year={year}
      years={reportYearOptions(year)}
      locale={user.locale}
      currencyCode={settings.currencyCode}
    />
  );
}
