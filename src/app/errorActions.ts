"use server";

import { recordClientError } from "@/lib/errorLog";

export async function recordClientErrorAction(
  message: string,
  stack: string | undefined,
  path: string | undefined,
): Promise<void> {
  await recordClientError(message, stack ?? null, path ?? null);
}
