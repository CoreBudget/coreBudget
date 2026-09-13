import type { useTranslations } from "next-intl";
import { td } from "@/lib/i18n/translateDynamicKey";

type Translate = ReturnType<typeof useTranslations>;

export const ASSET_TYPE_LABEL_KEYS: Record<string, string> = {
  property: "netWorth.assetTypes.property",
  land: "netWorth.assetTypes.land",
  vehicle: "netWorth.assetTypes.vehicle",
  investment: "netWorth.assetTypes.investment",
  other: "netWorth.assetTypes.other",
};

export const LIABILITY_TYPE_LABEL_KEYS: Record<string, string> = {
  mortgage: "netWorth.liabilityTypes.mortgage",
  auto_loan: "netWorth.liabilityTypes.autoLoan",
  student_loan: "netWorth.liabilityTypes.studentLoan",
  medical_debt: "netWorth.liabilityTypes.medicalDebt",
  personal_loan: "netWorth.liabilityTypes.personalLoan",
};

export function assetTypeLabel(t: Translate, type: string): string {
  const key = ASSET_TYPE_LABEL_KEYS[type];
  return key ? td(t, key) : type;
}

export function liabilityTypeLabel(t: Translate, type: string): string {
  const key = LIABILITY_TYPE_LABEL_KEYS[type];
  return key ? td(t, key) : type;
}
