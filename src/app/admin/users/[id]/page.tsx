import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getCurrentSession } from "@/lib/auth/session";
import { parseUserAgent } from "@/lib/userAgent";
import { lookupLocation } from "@/lib/geoLocation";
import { getPagePreference } from "@/lib/pagePreferences";
import UserDetail from "./UserDetail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.users.detailMetaTitle") };
}

const FETCH_LIMIT = 200;

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [user, sessions, history, current, rowsPerPage] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.userSession.findMany({
      where: { userId: id, revoked: false },
      orderBy: { startedAt: "desc" },
      take: FETCH_LIMIT,
    }),
    prisma.loginHistoryEntry.findMany({
      where: { userId: id },
      orderBy: { timestamp: "desc" },
      take: FETCH_LIMIT,
    }),
    getCurrentSession(),
    getPagePreference(admin.id, "adminUserDetail"),
  ]);

  if (!user) notFound();

  return (
    <UserDetail
      initialRowsPerPage={rowsPerPage}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        isAdmin: user.isAdmin,
      }}
      sessions={sessions.map((s) => {
        const parsed = parseUserAgent(s.device);
        return {
          id: s.id,
          browser: parsed?.browser ?? null,
          os: parsed?.os ?? null,
          ipAddress: s.ipAddress,
          location: lookupLocation(s.ipAddress),
          startedAt: s.startedAt.toISOString(),
          isCurrent: s.id === current?.sessionId,
        };
      })}
      history={history.map((h) => {
        const parsed = parseUserAgent(h.device);
        return {
          id: h.id,
          timestamp: h.timestamp.toISOString(),
          ipAddress: h.ipAddress,
          location: lookupLocation(h.ipAddress),
          browser: parsed?.browser ?? null,
          os: parsed?.os ?? null,
          result: h.result,
        };
      })}
    />
  );
}
