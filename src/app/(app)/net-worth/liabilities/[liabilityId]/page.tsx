import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSidebarAccounts, requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import { getPagePreference } from "@/lib/pagePreferences";
import LiabilityDetailView from "./LiabilityDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ liabilityId: string }>;
}): Promise<Metadata> {
  const { liabilityId } = await params;
  const liability = await prisma.liability.findUnique({ where: { id: liabilityId } });
  const t = await getTranslations();
  return { title: liability ? liability.name : t("netWorth.liabilityDetail.metaTitle") };
}

export default async function LiabilityPage({
  params,
}: {
  params: Promise<{ liabilityId: string }>;
}) {
  const { user, workspace, level } = await requireFeature(Feature.net_worth_liabilities);
  const { liabilityId } = await params;

  const [liability, settings, accounts, rowsPerPage] = await Promise.all([
    prisma.liability.findUnique({
      where: { id: liabilityId },
      include: {
        payments: { orderBy: { date: "asc" } },
        escrowEntries: { orderBy: { date: "asc" } },
      },
    }),
    getPlatformSettings(),
    getSidebarAccounts(workspace.budget.id),
    getPagePreference(user.id, "liabilityDetail"),
  ]);
  if (!liability || liability.budgetId !== workspace.budget.id) notFound();

  return (
    <LiabilityDetailView
      canEdit={level === "edit"}
      locale={user.locale}
      currencyCode={settings.currencyCode}
      cashAccounts={accounts.cash}
      initialRowsPerPage={rowsPerPage}
      liability={{
        id: liability.id,
        name: liability.name,
        type: liability.type,
        startingBalance: liability.startingBalance.toString(),
        balance: liability.balance.toString(),
        interestPaidToDate: liability.interestPaidToDate.toString(),
        interestRate: liability.interestRate?.toString() ?? null,
        minimumPayment: liability.minimumPayment?.toString() ?? null,
        paymentDueDay: liability.paymentDueDay,
        loanStartDate: liability.loanStartDate
          ? liability.loanStartDate.toISOString().slice(0, 10)
          : null,
      }}
      payments={liability.payments.map((p) => ({
        id: p.id,
        date: p.date.toISOString().slice(0, 10),
        paymentAmount: p.paymentAmount.toString(),
        principal: p.principal.toString(),
        interest: p.interest.toString(),
        escrowAmount: p.escrowAmount?.toString() ?? null,
        endingBalance: p.endingBalance.toString(),
        accountId: p.accountId,
        notes: p.notes,
      }))}
      escrowEntries={liability.escrowEntries.map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        type: e.type,
        amount: e.amount.toString(),
        runningBalance: e.runningBalance.toString(),
        description: e.description,
      }))}
    />
  );
}
