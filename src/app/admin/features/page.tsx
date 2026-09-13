import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformFeatureToggles } from "@/lib/platformFeatures";
import FeaturesPanel from "./FeaturesPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.features.metaTitle") };
}

export default async function FeaturesPage() {
  await requireAdmin();
  const toggles = await getPlatformFeatureToggles();

  return <FeaturesPanel toggles={toggles} />;
}
