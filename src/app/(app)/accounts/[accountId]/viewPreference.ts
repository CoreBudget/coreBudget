export const DATE_PRESETS = [
  "thisMonth",
  "last3Months",
  "thisYear",
  "lastYear",
  "allDates",
  "custom",
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const SORT_COLUMNS = [
  "date",
  "payee",
  "category",
  "memo",
  "debit",
  "credit",
  "runningBalance",
] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];

export type SortDirection = "asc" | "desc";

export interface DateBound {
  month: number;
  year: number;
}

export interface ViewPreference {
  datePreset: DatePreset;
  from: DateBound;
  to: DateBound;
  showReconciled: boolean;
  showRunningBalance: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

export interface ViewPreferenceOverrides {
  sortColumn?: SortColumn;
  sortDirection?: SortDirection;
  datePreset?: DatePreset;
}

function defaultViewPreference(overrides?: ViewPreferenceOverrides): ViewPreference {
  const now = new Date();
  return {
    datePreset: overrides?.datePreset ?? "allDates",
    from: { month: 1, year: now.getFullYear() },
    to: { month: 12, year: now.getFullYear() },
    showReconciled: true,
    showRunningBalance: true,
    sortColumn: overrides?.sortColumn ?? "date",
    sortDirection: overrides?.sortDirection ?? "desc",
  };
}

export function isDatePreset(value: unknown): value is DatePreset {
  return typeof value === "string" && (DATE_PRESETS as readonly string[]).includes(value);
}

export function isSortColumn(value: unknown): value is SortColumn {
  return typeof value === "string" && (SORT_COLUMNS as readonly string[]).includes(value);
}

export function isSortDirection(value: unknown): value is SortDirection {
  return value === "asc" || value === "desc";
}

function isDateBound(value: unknown): value is DateBound {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as DateBound).month === "number" &&
    typeof (value as DateBound).year === "number"
  );
}

export function parseViewPreference(
  raw: unknown,
  overrides?: ViewPreferenceOverrides,
): ViewPreference {
  const fallback = defaultViewPreference(overrides);
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;

  return {
    datePreset: isDatePreset(r.datePreset) ? r.datePreset : fallback.datePreset,
    from: isDateBound(r.from) ? r.from : fallback.from,
    to: isDateBound(r.to) ? r.to : fallback.to,
    showReconciled:
      typeof r.showReconciled === "boolean" ? r.showReconciled : fallback.showReconciled,
    showRunningBalance:
      typeof r.showRunningBalance === "boolean"
        ? r.showRunningBalance
        : fallback.showRunningBalance,
    sortColumn: isSortColumn(r.sortColumn) ? r.sortColumn : fallback.sortColumn,
    sortDirection:
      r.sortDirection === "asc" || r.sortDirection === "desc"
        ? r.sortDirection
        : fallback.sortDirection,
  };
}

export function presetToRange(
  preset: DatePreset,
  today: Date,
  dataMinYear: number,
  dataMaxYear: number,
): { from: DateBound; to: DateBound } {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;

  switch (preset) {
    case "thisMonth":
      return { from: { month: m, year: y }, to: { month: m, year: y } };
    case "last3Months": {
      let fromMonth = m - 2;
      let fromYear = y;
      if (fromMonth < 1) {
        fromMonth += 12;
        fromYear -= 1;
      }
      return { from: { month: fromMonth, year: fromYear }, to: { month: m, year: y } };
    }
    case "thisYear":
      return { from: { month: 1, year: y }, to: { month: 12, year: y } };
    case "lastYear":
      return { from: { month: 1, year: y - 1 }, to: { month: 12, year: y - 1 } };
    case "allDates":
      return { from: { month: 1, year: dataMinYear }, to: { month: 12, year: dataMaxYear } };
    case "custom":
      return { from: { month: 1, year: y }, to: { month: 12, year: y } };
  }
}

function boundKey(b: DateBound): number {
  return b.year * 12 + b.month;
}

export function isWithinRange(postDate: string, from: DateBound, to: DateBound): boolean {
  const d = new Date(postDate);
  const key = d.getUTCFullYear() * 12 + (d.getUTCMonth() + 1);
  return key >= boundKey(from) && key <= boundKey(to);
}
