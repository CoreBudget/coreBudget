export function stripAmountFormatting(value: string): string {
  return value.replace(/,/g, "").trim();
}

export function parseAmountInput(value: string): number {
  return Number(stripAmountFormatting(value));
}
