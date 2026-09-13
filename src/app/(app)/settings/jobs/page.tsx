import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import JobsPanel from "./JobsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.jobs.metaTitle") };
}

export default async function JobsPage() {
  const user = await requireUser();

  const jobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <JobsPanel
      jobs={jobs.map((j) => ({
        id: j.id,
        name: j.name,
        payPeriodType: j.payPeriodType,
        isActive: j.isActive,
      }))}
    />
  );
}
