import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/prisma";
import { getSetupStep } from "@/lib/platform";
import { sessionOptions } from "@/lib/auth/session";

const PUBLIC_PREFIXES = ["/invite/", "/reset-password/"];
const PUBLIC_PATHS = ["/login", "/robots.txt"];

interface SessionCookieData {
  sessionId?: string;
}

function noIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookieSession = await getIronSession<SessionCookieData>(await cookies(), sessionOptions);
  const sessionId = cookieSession.sessionId;

  let authenticated = false;
  if (sessionId) {
    const dbSession = await prisma.userSession.findUnique({ where: { id: sessionId } });
    authenticated = !!dbSession && !dbSession.revoked;
  }

  const setupStep = await getSetupStep();
  const mandatorySetupPending =
    setupStep === "admin" ||
    setupStep === "household" ||
    setupStep === "budget" ||
    setupStep === "account";

  if (mandatorySetupPending) {
    if (pathname !== "/setup") {
      return noIndex(NextResponse.redirect(new URL("/setup", request.url)));
    }
    return noIndex(NextResponse.next());
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!authenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return noIndex(NextResponse.redirect(loginUrl));
  }

  if (authenticated && pathname === "/login") {
    return noIndex(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return noIndex(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|serwist|api|icons/).*)"],
};
