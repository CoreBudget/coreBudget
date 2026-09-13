"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { Feature } from "@/generated/prisma/client";

export interface FormResult {
  error?: string;
}

export async function setFeatureToggleAction(
  feature: Feature,
  enabled: boolean,
): Promise<FormResult> {
  try {
    await requireAdmin();
    await prisma.platformFeatureToggle.upsert({
      where: { feature },
      create: { feature, enabled },
      update: { enabled },
    });
    revalidatePath("/admin/features");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
