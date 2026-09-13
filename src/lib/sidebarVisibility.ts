import "server-only";
import { prisma } from "@/lib/prisma";
import {
  SIDEBAR_VISIBILITY_KEYS,
  SIDEBAR_VISIBILITY_KEY_LIST,
  type SidebarPageKey,
} from "./sidebarVisibilityKeys";

export async function getSidebarVisibilityPreferences(
  userId: string,
): Promise<Record<SidebarPageKey, boolean>> {
  const rows = await prisma.userSidebarVisibilityPreference.findMany({ where: { userId } });
  const byKey = new Map(rows.map((r) => [r.pageKey, r.visible]));

  return Object.fromEntries(
    SIDEBAR_VISIBILITY_KEY_LIST.map((key) => [
      key,
      byKey.get(key) ?? SIDEBAR_VISIBILITY_KEYS[key].defaultVisible,
    ]),
  ) as Record<SidebarPageKey, boolean>;
}
