import "server-only";
import { cookies, headers } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/lib/platform";
import type { User } from "@/generated/prisma/client";

interface SessionCookieData {
  sessionId?: string;
  pendingLoginUserId?: string;
  currentBudgetId?: string;
}

export const sessionOptions: SessionOptions = {
  cookieName: "corebudget_session",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

async function getIronCookieSession(): Promise<IronSession<SessionCookieData>> {
  return getIronSession<SessionCookieData>(await cookies(), sessionOptions);
}

export async function setPendingLogin(userId: string): Promise<void> {
  const cookieSession = await getIronCookieSession();
  cookieSession.pendingLoginUserId = userId;
  await cookieSession.save();
}

export async function getPendingLoginUserId(): Promise<string | null> {
  const cookieSession = await getIronCookieSession();
  return cookieSession.pendingLoginUserId ?? null;
}

export async function clearPendingLogin(): Promise<void> {
  const cookieSession = await getIronCookieSession();
  delete cookieSession.pendingLoginUserId;
  await cookieSession.save();
}

export async function createSession(userId: string): Promise<void> {
  const h = await headers();
  const device = h.get("user-agent") ?? undefined;
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;

  const dbSession = await prisma.userSession.create({
    data: { userId, device, ipAddress },
  });

  const cookieSession = await getIronCookieSession();
  delete cookieSession.pendingLoginUserId;
  cookieSession.sessionId = dbSession.id;
  await cookieSession.save();
}

export interface CurrentSession {
  user: User;
  sessionId: string;
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieSession = await getIronCookieSession();
  const sessionId = cookieSession.sessionId;
  if (!sessionId) return null;

  const dbSession = await prisma.userSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!dbSession || dbSession.revoked) return null;

  const { sessionTimeoutMinutes } = await getPlatformSettings();
  const idleMs = Date.now() - dbSession.lastActiveAt.getTime();
  if (idleMs > sessionTimeoutMinutes * 60_000) return null;

  if (dbSession.user.status !== "active") return null;

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });

  return { user: dbSession.user, sessionId: dbSession.id };
}

export async function getCurrentBudgetId(): Promise<string | null> {
  const cookieSession = await getIronCookieSession();
  return cookieSession.currentBudgetId ?? null;
}

export async function setCurrentBudgetId(budgetId: string): Promise<void> {
  const cookieSession = await getIronCookieSession();
  cookieSession.currentBudgetId = budgetId;
  await cookieSession.save();
}

export async function destroySession(): Promise<void> {
  const cookieSession = await getIronCookieSession();
  const { sessionId } = cookieSession;
  cookieSession.destroy();
  if (sessionId) {
    await prisma.userSession
      .update({
        where: { id: sessionId },
        data: { revoked: true },
      })
      .catch(() => {
        // Session row may already be gone; destroying the cookie is what matters here.
      });
  }
}
