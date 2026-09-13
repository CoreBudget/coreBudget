import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPagePreference } from "@/lib/pagePreferences";
import PayeesTable from "./PayeesTable";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.payees.metaTitle") };
}

export default async function PayeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin();
  const { q } = await searchParams;

  const [payees, stats, rowsPerPage] = await Promise.all([
    prisma.payee.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      include: { _count: { select: { renamingRules: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["payeeId"],
      _count: { _all: true },
      _max: { postDate: true },
    }),
    getPagePreference(admin.id, "adminPayees"),
  ]);

  const statsByPayeeId = new Map(stats.map((s) => [s.payeeId, s]));

  return (
    <PayeesTable
      query={q ?? ""}
      initialRowsPerPage={rowsPerPage}
      payees={payees.map((p) => ({
        id: p.id,
        name: p.name,
        includeInList: p.includeInList,
        enableAutoCategory: p.enableAutoCategory,
        ruleCount: p._count.renamingRules,
        txnCount: statsByPayeeId.get(p.id)?._count._all ?? 0,
        lastUsed: statsByPayeeId.get(p.id)?._max.postDate?.toISOString() ?? null,
      }))}
    />
  );
}
