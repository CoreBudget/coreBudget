"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "./ToastProvider";
import { td } from "@/lib/i18n/translateDynamicKey";

export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const t = useTranslations();
  const { showToast } = useToast();

  function run<T extends { error?: string }>(
    action: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: string) => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        if (onError) onError(result.error);
        else showToast(td(t, result.error), "error");
        return;
      }
      onSuccess?.(result);
    });
  }

  return { pending, run };
}
