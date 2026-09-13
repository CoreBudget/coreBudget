import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { DATE_FORMAT_OPTIONS } from "@/lib/date";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locale";
import LocalizationPanel from "./LocalizationPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.localization.metaTitle") };
}

export default async function LocalizationPage() {
  const user = await requireUser();

  let timezones: string[];
  try {
    timezones = Intl.supportedValuesOf("timeZone");
  } catch {
    timezones = ["UTC"];
  }

  return (
    <LocalizationPanel
      locale={user.locale ?? SUPPORTED_LOCALES[0]}
      timezone={user.timezone ?? "UTC"}
      dateFormatPreference={user.dateFormatPreference ?? DATE_FORMAT_OPTIONS[0]}
      timezones={timezones}
      locales={[...SUPPORTED_LOCALES]}
    />
  );
}
