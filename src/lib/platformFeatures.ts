import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Feature } from "@/generated/prisma/client";

export async function getPlatformFeatureToggles(): Promise<Record<Feature, boolean>> {
  const rows = await prisma.platformFeatureToggle.findMany();
  const byFeature = new Map(rows.map((r) => [r.feature, r.enabled]));
  return Object.fromEntries(
    Object.values(Feature).map((feature) => [feature, byFeature.get(feature) ?? true]),
  ) as Record<Feature, boolean>;
}

export async function requireInstanceFeatureEnabled(feature: Feature): Promise<void> {
  const toggles = await getPlatformFeatureToggles();
  if (!toggles[feature]) redirect("/dashboard");
}
