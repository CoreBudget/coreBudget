import "server-only";
import { prisma } from "@/lib/prisma";
import { PAGE_PREFERENCE_KEYS, PAGE_PREFERENCE_KEY_LIST, type PageKey } from "./pagePreferenceKeys";

export async function getPagePreferences(userId: string): Promise<Record<PageKey, number>> {
  const rows = await prisma.userPagePreference.findMany({ where: { userId } });
  const byKey = new Map(rows.map((r) => [r.pageKey, r.rowsPerPage]));

  return Object.fromEntries(
    PAGE_PREFERENCE_KEY_LIST.map((key) => [
      key,
      byKey.get(key) ?? PAGE_PREFERENCE_KEYS[key].defaultRowsPerPage,
    ]),
  ) as Record<PageKey, number>;
}

export async function getPagePreference(userId: string, key: PageKey): Promise<number> {
  const row = await prisma.userPagePreference.findUnique({
    where: { userId_pageKey: { userId, pageKey: key } },
  });
  return row?.rowsPerPage ?? PAGE_PREFERENCE_KEYS[key].defaultRowsPerPage;
}
