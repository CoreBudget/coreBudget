import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/userAgent";
import { lookupLocation } from "@/lib/geoLocation";
import SecurityPanel from "./SecurityPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.security.metaTitle") };
}

export default async function SecurityPage() {
  const user = await requireUser();
  const session = await getCurrentSession();

  const [sessions, loginHistory] = await Promise.all([
    prisma.userSession.findMany({
      where: { userId: user.id, revoked: false },
      orderBy: { lastActiveAt: "desc" },
    }),
    prisma.loginHistoryEntry.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),
  ]);

  return (
    <SecurityPanel
      twoFactorEnabled={user.twoFactorEnabled}
      currentSessionId={session?.sessionId ?? null}
      timezone={user.timezone}
      dateFormatPreference={user.dateFormatPreference}
      sessions={sessions.map((s) => {
        const parsed = parseUserAgent(s.device);
        return {
          id: s.id,
          browser: parsed?.browser ?? null,
          os: parsed?.os ?? null,
          ipAddress: s.ipAddress,
          location: lookupLocation(s.ipAddress),
          startedAt: s.startedAt.toISOString(),
          lastActiveAt: s.lastActiveAt.toISOString(),
        };
      })}
      loginHistory={loginHistory.map((entry) => {
        const parsed = parseUserAgent(entry.device);
        return {
          id: entry.id,
          timestamp: entry.timestamp.toISOString(),
          browser: parsed?.browser ?? null,
          os: parsed?.os ?? null,
          ipAddress: entry.ipAddress,
          location: lookupLocation(entry.ipAddress),
          result: entry.result,
        };
      })}
    />
  );
}
