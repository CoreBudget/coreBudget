import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import type { RepeatType } from "@/generated/prisma/client";

export function nextOccurrence(
  current: Date,
  repeatType: RepeatType,
  intervalWeeks?: number | null,
): Date {
  switch (repeatType) {
    case "daily":
      return addDays(current, 1);
    case "weekly":
      return addWeeks(current, 1);
    case "every_n_weeks":
      return addWeeks(current, intervalWeeks ?? 1);
    case "twice_a_month":
      return addWeeks(current, 2);
    case "monthly":
      return addMonths(current, 1);
    case "every_3_months":
      return addMonths(current, 3);
    case "every_4_months":
      return addMonths(current, 4);
    case "yearly":
      return addYears(current, 1);
  }
}
