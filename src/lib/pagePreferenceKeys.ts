export const PAGE_PREFERENCE_KEYS = {
  auditLog: { defaultRowsPerPage: 25, options: [25, 50, 75, 100] },
  liabilityDetail: { defaultRowsPerPage: 5, options: [5, 10, 25] },
  adminBackups: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminJobHistory: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminErrorLog: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminHouseholds: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminPayees: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminPayeeDetail: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminUsers: { defaultRowsPerPage: 10, options: [5, 10, 25] },
  adminUserDetail: { defaultRowsPerPage: 10, options: [5, 10, 25] },
} as const;

export type PageKey = keyof typeof PAGE_PREFERENCE_KEYS;

export const PAGE_PREFERENCE_KEY_LIST = Object.keys(PAGE_PREFERENCE_KEYS) as PageKey[];

export function isPageKey(value: string): value is PageKey {
  return value in PAGE_PREFERENCE_KEYS;
}

export function isValidPageSize(key: PageKey, rowsPerPage: number): boolean {
  return (PAGE_PREFERENCE_KEYS[key].options as readonly number[]).includes(rowsPerPage);
}
