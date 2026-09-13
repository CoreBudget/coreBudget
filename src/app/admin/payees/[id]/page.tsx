import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPagePreference } from "@/lib/pagePreferences";
import PayeeDetail from "./PayeeDetail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.payees.detailMetaTitle") };
}

export default async function PayeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [payee, rules, txnCount, rowsPerPage] = await Promise.all([
    prisma.payee.findUnique({ where: { id } }),
    prisma.payeeRenamingRule.findMany({ where: { payeeId: id }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.count({ where: { payeeId: id } }),
    getPagePreference(admin.id, "adminPayeeDetail"),
  ]);

  if (!payee) notFound();

  return (
    <PayeeDetail
      payee={{
        id: payee.id,
        name: payee.name,
        includeInList: payee.includeInList,
        enableAutoCategory: payee.enableAutoCategory,
        txnCount,
      }}
      rules={rules.map((r) => ({ id: r.id, matchType: r.matchType, pattern: r.pattern }))}
      initialRowsPerPage={rowsPerPage}
    />
  );
}
