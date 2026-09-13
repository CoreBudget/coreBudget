import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { getFeaturePermissions } from "@/lib/workspace";
import { Feature } from "@/generated/prisma/client";

const rateLimiter = new RateLimiterMemory({ points: 60, duration: 60 });

export interface ApiAuthContext {
  tokenId: string;
  userId: string;
  budgetId: string;
}

function errorResponse(status: number, error: string, retryAfterSeconds?: number): NextResponse {
  const headers = retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined;
  return NextResponse.json({ error }, { status, headers });
}

export async function authenticateApiRequest(
  request: NextRequest,
  requiredFeatures: Feature | Feature[],
): Promise<ApiAuthContext | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!rawToken) return errorResponse(401, "Missing or malformed Authorization header.");

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!token || token.revokedAt || token.user.status !== "active") {
    return errorResponse(401, "Invalid or revoked API token.");
  }

  try {
    await rateLimiter.consume(token.id);
  } catch (rejection) {
    const retryAfterSeconds =
      rejection instanceof RateLimiterRes ? Math.ceil(rejection.msBeforeNext / 1000) : 60;
    return errorResponse(
      429,
      "Rate limit exceeded (60 requests/minute per token).",
      retryAfterSeconds,
    );
  }

  const features = Array.isArray(requiredFeatures) ? requiredFeatures : [requiredFeatures];
  const permissions = await getFeaturePermissions(token.userId, token.budgetId);
  if (features.some((feature) => permissions[feature] === "no_access")) {
    return errorResponse(403, "This token's owner does not have access to this data.");
  }

  await prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });

  return { tokenId: token.id, userId: token.userId, budgetId: token.budgetId };
}
