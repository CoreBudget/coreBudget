import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import ProfilePanel from "./ProfilePanel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("settings.profile.metaTitle") };
}

export default async function ProfilePage() {
  const user = await requireUser();
  return <ProfilePanel name={user.name} email={user.email} />;
}
