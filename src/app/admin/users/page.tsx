import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPagePreference } from "@/lib/pagePreferences";
import UsersTable from "./UsersTable";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.users.metaTitle") };
}

export default async function UsersPage() {
  const admin = await requireAdmin();

  const [users, lastLogins, rowsPerPage] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.loginHistoryEntry.findMany({
      where: { result: "success" },
      orderBy: { timestamp: "desc" },
      distinct: ["userId"],
    }),
    getPagePreference(admin.id, "adminUsers"),
  ]);

  const lastLoginByUserId = new Map(lastLogins.map((l) => [l.userId, l.timestamp]));

  return (
    <UsersTable
      currentAdminId={admin.id}
      initialRowsPerPage={rowsPerPage}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        isAdmin: u.isAdmin,
        twoFactorEnabled: u.twoFactorEnabled,
        lastLogin: lastLoginByUserId.get(u.id)?.toISOString() ?? null,
      }))}
    />
  );
}
