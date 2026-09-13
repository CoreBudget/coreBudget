import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getApiEndpointDoc } from "@/lib/apiEndpointDocs";
import ApiEndpointDetail from "./ApiEndpointDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ endpoint: string }>;
}): Promise<Metadata> {
  const { endpoint } = await params;
  const doc = getApiEndpointDoc(endpoint);
  const t = await getTranslations();
  return {
    title: doc
      ? `GET ${doc.path} | ${t("admin.docs.apiEndpointDetail.metaTitleSuffix")}`
      : t("admin.docs.metaTitle"),
  };
}

export default async function ApiEndpointDetailPage({
  params,
}: {
  params: Promise<{ endpoint: string }>;
}) {
  await requireAdmin();
  const { endpoint } = await params;
  const doc = getApiEndpointDoc(endpoint);
  if (!doc) notFound();

  return <ApiEndpointDetail doc={doc} />;
}
