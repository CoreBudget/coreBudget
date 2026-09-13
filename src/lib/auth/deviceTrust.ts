import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

const COOKIE_NAME = "corebudget_device";
const TRUST_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

interface DeviceTrustPayload {
  userId: string;
  expiresAt: number;
}

export async function trustThisDevice(userId: string): Promise<void> {
  const seal = await sealData(
    { userId, expiresAt: Date.now() + TRUST_DURATION_MS } satisfies DeviceTrustPayload,
    { password: process.env.SESSION_SECRET! },
  );
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, seal, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUST_DURATION_MS / 1000,
  });
}

export async function isDeviceTrusted(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const seal = cookieStore.get(COOKIE_NAME)?.value;
  if (!seal) return false;

  try {
    const payload = await unsealData<DeviceTrustPayload>(seal, {
      password: process.env.SESSION_SECRET!,
    });
    return payload.userId === userId && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}
