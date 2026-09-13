import type { RepeatType } from "@/generated/prisma/client";

export const CADENCE_OPTIONS = [
  "weekly",
  "biweekly",
  "monthly",
  "every_3_months",
  "every_4_months",
  "yearly",
] as const;
export type CadenceOption = (typeof CADENCE_OPTIONS)[number];

export function cadenceToRepeatType(cadence: CadenceOption): {
  repeatType: RepeatType;
  intervalWeeks: number | null;
} {
  if (cadence === "biweekly") return { repeatType: "every_n_weeks", intervalWeeks: 2 };
  return { repeatType: cadence as RepeatType, intervalWeeks: null };
}

export function repeatTypeToCadence(
  repeatType: RepeatType,
  intervalWeeks: number | null,
): CadenceOption {
  if (repeatType === "every_n_weeks" && intervalWeeks === 2) return "biweekly";
  if ((CADENCE_OPTIONS as readonly string[]).includes(repeatType))
    return repeatType as CadenceOption;
  return "monthly";
}
