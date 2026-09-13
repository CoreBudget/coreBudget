import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import DocsPanel from "./DocsPanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.docs.metaTitle") };
}

export default async function DocsPage() {
  await requireAdmin();
  return <DocsPanel />;
}
