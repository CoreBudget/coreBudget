import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Feature } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/workspace";
import { getPlatformSettings } from "@/lib/platform";
import AssetDetailView from "./AssetDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ assetId: string }>;
}): Promise<Metadata> {
  const { assetId } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  const t = await getTranslations();
  return { title: asset ? asset.name : t("netWorth.assetDetail.metaTitle") };
}

export default async function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { user, workspace, level } = await requireFeature(Feature.net_worth_assets);
  const { assetId } = await params;

  const [asset, settings] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      include: { valueChanges: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
    }),
    getPlatformSettings(),
  ]);
  if (!asset || asset.budgetId !== workspace.budget.id) notFound();

  return (
    <AssetDetailView
      canEdit={level === "edit"}
      locale={user.locale}
      currencyCode={settings.currencyCode}
      asset={{
        id: asset.id,
        name: asset.name,
        type: asset.type,
        value: asset.value.toString(),
        description: asset.description,
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().slice(0, 10) : null,
      }}
      history={asset.valueChanges.map((v) => ({
        id: v.id,
        date: v.date.toISOString().slice(0, 10),
        value: v.value.toString(),
        description: v.description,
      }))}
    />
  );
}
