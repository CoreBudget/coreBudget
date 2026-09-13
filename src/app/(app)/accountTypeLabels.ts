import type { useTranslations } from "next-intl";
import { td } from "@/lib/i18n/translateDynamicKey";

type Translate = ReturnType<typeof useTranslations>;

export const ACCOUNT_TYPE_LABEL_KEYS: Record<string, string> = {
  checking: "accounts.types.checking",
  savings: "accounts.types.savings",
  cash: "accounts.types.cash",
  investment: "accounts.types.investment",
  credit: "accounts.types.credit",
  line_credit: "accounts.types.lineCredit",
};

export function accountTypeLabel(t: Translate, type: string): string {
  const key = ACCOUNT_TYPE_LABEL_KEYS[type];
  return key ? td(t, key) : type;
}
