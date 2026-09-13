type TranslateValues = Record<string, string | number | Date>;

export function td(t: unknown, key: string, values?: TranslateValues): string {
  return (t as (key: string, values?: TranslateValues) => string)(key, values);
}
