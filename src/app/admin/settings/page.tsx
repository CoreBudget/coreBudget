import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/platform";
import SettingsPanel from "./SettingsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.settings.metaTitle") };
}

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getPlatformSettings();

  return (
    <SettingsPanel
      settings={{
        defaultLocale: settings.defaultLocale,
        currencyCode: settings.currencyCode,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpFromAddress: settings.smtpFromAddress,
        smtpConfigured: !!settings.smtpPasswordEncrypted,
        vapidPublicKey: settings.vapidPublicKey,
      }}
    />
  );
}
