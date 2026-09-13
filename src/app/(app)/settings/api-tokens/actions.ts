"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { getAccessibleHouseholds } from "@/lib/workspace";
import { generateToken, hashToken } from "@/lib/auth/tokens";

export interface FormResult {
  error?: string;
}

export interface CreateTokenResult extends FormResult {
  token?: string;
}

function revalidate() {
  revalidatePath("/settings/api-tokens");
}

const createTokenSchema = z.object({
  label: z.string().trim().min(1, "settings.apiTokens.errors.labelRequired"),
  budgetId: z.string().trim().min(1, "settings.apiTokens.errors.budgetRequired"),
});

export async function createApiTokenAction(
  _prev: CreateTokenResult,
  formData: FormData,
): Promise<CreateTokenResult> {
  const user = await requireUser();
  const parsed = createTokenSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const households = await getAccessibleHouseholds(user.id);
  const allowed = households.some((h) => h.budgets.some((b) => b.id === parsed.data.budgetId));
  if (!allowed) return { error: "common.errors.notAllowed" };

  const rawToken = `cb_${generateToken()}`;

  await prisma.apiToken.create({
    data: {
      userId: user.id,
      budgetId: parsed.data.budgetId,
      label: parsed.data.label,
      tokenHash: hashToken(rawToken),
      tokenPreview: rawToken.slice(-4),
    },
  });
  revalidate();
  return { token: rawToken };
}

export async function revokeApiTokenAction(id: string): Promise<FormResult> {
  try {
    const user = await requireUser();
    const token = await prisma.apiToken.findUnique({ where: { id } });
    if (!token || token.userId !== user.id) {
      return { error: "settings.apiTokens.errors.tokenNotFound" };
    }

    await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
    revalidate();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "common.errors.notAllowed" };
  }
}
