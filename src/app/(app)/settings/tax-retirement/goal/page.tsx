import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import RetirementGoalPanel from "./RetirementGoalPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.taxRetirement.goal.metaTitle") };
}

export default async function RetirementGoalPage() {
  const user = await requireUser();
  const [settings, accounts, platformSettings] = await Promise.all([
    prisma.userTaxSettings.findUnique({ where: { userId: user.id } }),
    prisma.retirementAccount.findMany({ where: { userId: user.id }, select: { balance: true } }),
    getPlatformSettings(),
  ]);

  const currentTotal = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <RetirementGoalPanel
      locale={user.locale}
      currencyCode={platformSettings.currencyCode}
      currentTotal={currentTotal}
      retirementGoalAmount={settings?.retirementGoalAmount?.toString() ?? ""}
      retirementGoalAge={settings?.retirementGoalAge?.toString() ?? ""}
    />
  );
}
