import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import AdminShell from "./AdminShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("admin.shell.metaTitle") };
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
