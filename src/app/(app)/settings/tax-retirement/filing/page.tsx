import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import TaxFilingPanel from "./TaxFilingPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.taxRetirement.filing.metaTitle") };
}

export default async function TaxFilingPage() {
  const user = await requireUser();
  const settings = await prisma.userTaxSettings.findUnique({ where: { userId: user.id } });

  return (
    <TaxFilingPanel
      fillingType={settings?.fillingType ?? "single"}
      stateTaxRate={settings?.stateTaxRate?.toString() ?? ""}
      socialSecurityRate={settings?.socialSecurityRate?.toString() ?? ""}
      medicareRate={settings?.medicareRate?.toString() ?? ""}
      fourZeroOneKContributionRate={settings?.fourZeroOneKContributionRate?.toString() ?? ""}
      fourZeroOneKMatchRate={settings?.fourZeroOneKMatchRate?.toString() ?? ""}
      fourZeroOneKMaxContributionRate={settings?.fourZeroOneKMaxContributionRate?.toString() ?? ""}
      standardDeduction={settings?.standardDeduction?.toString() ?? ""}
      childDependencyCredit={settings?.childDependencyCredit?.toString() ?? ""}
      otherDependencyCredit={settings?.otherDependencyCredit?.toString() ?? ""}
      eligibleChildDependents={settings?.eligibleChildDependents?.toString() ?? ""}
      eligibleOtherDependents={settings?.eligibleOtherDependents?.toString() ?? ""}
      studentLoanCapAmount={settings?.studentLoanCapAmount?.toString() ?? ""}
    />
  );
}
