import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import WithholdingPanel from "./WithholdingPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.taxRetirement.withholding.metaTitle") };
}

export default async function WithholdingPage() {
  const user = await requireUser();
  const [settings, platformSettings] = await Promise.all([
    prisma.userTaxSettings.findUnique({ where: { userId: user.id } }),
    getPlatformSettings(),
  ]);

  return (
    <WithholdingPanel
      locale={user.locale}
      currencyCode={platformSettings.currencyCode}
      ytdWithheldAmount={settings?.ytdWithheldAmount?.toString() ?? ""}
      estimatedTaxLiability={settings?.estimatedTaxLiability?.toString() ?? ""}
    />
  );
}
