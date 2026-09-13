import { parse } from "csv-parse/sync";

const MAX_ROWS = 2000;

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvText(text: string): ParsedCsv {
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (rows.length > MAX_ROWS) {
    throw new Error(`csvImport.errors.tooManyRows`);
  }

  return { headers: Object.keys(rows[0] ?? {}), rows };
}
