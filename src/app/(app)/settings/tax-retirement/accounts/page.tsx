import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import RetirementAccountsPanel from "./RetirementAccountsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.taxRetirement.accounts.metaTitle") };
}

export default async function RetirementAccountsPage() {
  const user = await requireUser();
  const settings = await getPlatformSettings();

  const accounts = await prisma.retirementAccount.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });

  return (
    <RetirementAccountsPanel
      locale={user.locale}
      currencyCode={settings.currencyCode}
      accounts={accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance.toString(),
        contributionPct: a.contributionPct?.toString() ?? null,
      }))}
    />
  );
}
