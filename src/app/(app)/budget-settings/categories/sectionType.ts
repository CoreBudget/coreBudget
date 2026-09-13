export const SECTION_TYPES = ["expense", "income", "savings", "cc_payment"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export function sectionTypeFlags(type: SectionType) {
  return {
    isIncome: type === "income",
    isSavings: type === "savings",
    isCreditCardPayment: type === "cc_payment",
  };
}

export function sectionType(section: {
  isIncome: boolean;
  isSavings: boolean;
  isCreditCardPayment: boolean;
}): SectionType {
  if (section.isIncome) return "income";
  if (section.isSavings) return "savings";
  if (section.isCreditCardPayment) return "cc_payment";
  return "expense";
}
