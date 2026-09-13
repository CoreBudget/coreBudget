"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { isPageKey, isValidPageSize } from "@/lib/pagePreferenceKeys";
import {
  DATE_PRESETS,
  SORT_COLUMNS,
  type DatePreset,
  type SortColumn,
  type SortDirection,
} from "../../../accounts/[accountId]/viewPreference";

export interface FormResult {
  error?: string;
}

function revalidate() {
  revalidatePath("/settings/preferences");
}

export async function setPagePreferenceAction(
  pageKey: string,
  rowsPerPage: number,
): Promise<FormResult> {
  const user = await requireUser();
  if (!isPageKey(pageKey)) return { error: "settings.errors.invalidPageKey" };
  if (!isValidPageSize(pageKey, rowsPerPage)) {
    return { error: "settings.errors.invalidPageSize" };
  }

  await prisma.userPagePreference.upsert({
    where: { userId_pageKey: { userId: user.id, pageKey } },
    create: { userId: user.id, pageKey, rowsPerPage },
    update: { rowsPerPage },
  });
  revalidate();
  return {};
}

const sortColumnSchema = z.enum(SORT_COLUMNS, "settings.errors.invalidSortColumn");
const sortDirectionSchema = z.enum(
  ["asc", "desc"] as const,
  "settings.errors.invalidSortDirection",
);

export async function setDefaultLedgerSortAction(
  sortColumn: SortColumn,
  sortDirection: SortDirection,
): Promise<FormResult> {
  const user = await requireUser();
  const parsedColumn = sortColumnSchema.safeParse(sortColumn);
  if (!parsedColumn.success) return { error: parsedColumn.error.issues[0]?.message };
  const parsedDirection = sortDirectionSchema.safeParse(sortDirection);
  if (!parsedDirection.success) return { error: parsedDirection.error.issues[0]?.message };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultLedgerSortColumn: parsedColumn.data,
      defaultLedgerSortDirection: parsedDirection.data,
    },
  });
  revalidate();
  return {};
}

const SELECTABLE_DATE_PRESETS = DATE_PRESETS.filter((p) => p !== "custom") as [
  DatePreset,
  ...DatePreset[],
];
const datePresetSchema = z.enum(SELECTABLE_DATE_PRESETS, "settings.errors.invalidDatePreset");

export async function setDefaultLedgerDatePresetAction(
  datePreset: DatePreset,
): Promise<FormResult> {
  const user = await requireUser();
  const parsed = datePresetSchema.safeParse(datePreset);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultLedgerDatePreset: parsed.data },
  });
  revalidate();
  return {};
}

export async function setPlanSectionsDefaultOpenAction(open: boolean): Promise<FormResult> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { planSectionsDefaultOpen: open },
  });
  revalidate();
  return {};
}

export async function setBudgetSectionsDefaultOpenAction(open: boolean): Promise<FormResult> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { budgetSectionsDefaultOpen: open },
  });
  revalidate();
  return {};
}
