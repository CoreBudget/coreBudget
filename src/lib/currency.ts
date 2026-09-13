export function formatCurrency(
  amount: number | string,
  locale: string | null | undefined,
  currencyCode: string,
): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(locale || "en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}
