"use server";

import { requireUser } from "@/lib/auth/guards";
import { parseCsvText } from "@/lib/csv";

export interface ParseCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  error?: string;
}

export async function parseCsvAction(text: string): Promise<ParseCsvResult> {
  await requireUser();
  try {
    const { headers, rows } = parseCsvText(text);
    if (rows.length === 0) return { headers: [], rows: [], error: "csvImport.errors.empty" };
    return { headers, rows };
  } catch (err) {
    return {
      headers: [],
      rows: [],
      error: err instanceof Error ? err.message : "csvImport.errors.parseFailed",
    };
  }
}
