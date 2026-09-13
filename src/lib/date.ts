export function formatDateOnly(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export const DATE_FORMAT_OPTIONS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
type DateFormatPreference = (typeof DATE_FORMAT_OPTIONS)[number];

function formatDateParts(
  parts: Record<string, string>,
  dateFormat: string | null | undefined,
): string {
  const format: DateFormatPreference = (DATE_FORMAT_OPTIONS as readonly string[]).includes(
    dateFormat ?? "",
  )
    ? (dateFormat as DateFormatPreference)
    : "MM/DD/YYYY";
  return format === "DD/MM/YYYY"
    ? `${parts.day}/${parts.month}/${parts.year}`
    : format === "YYYY-MM-DD"
      ? `${parts.year}-${parts.month}-${parts.day}`
      : `${parts.month}/${parts.day}/${parts.year}`;
}

export function formatDateTime(
  date: Date | string,
  timezone: string | null | undefined,
  dateFormat: string | null | undefined,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = timezone || "UTC";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const timePart = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatDateParts(parts, dateFormat)}, ${timePart}`;
}

export function formatDateOnlyPreference(
  iso: string,
  dateFormat: string | null | undefined,
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return formatDateParts(parts, dateFormat);
}
