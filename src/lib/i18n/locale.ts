import "server-only";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformSettings } from "@/lib/platform";

export const SUPPORTED_LOCALES = ["en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export async function getEffectiveLocale(): Promise<SupportedLocale> {
  const session = await getCurrentSession();
  const candidate = session?.user.locale ?? (await getPlatformSettings()).defaultLocale;
  return isSupportedLocale(candidate) ? candidate : "en";
}

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
