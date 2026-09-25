export type Frequency = "Weekly" | "Monthly" | "Quarterly";
export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const WEEKDAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Trailing window ending on `anchor`, sized to the configuration's frequency. */
export function periodFor(frequency: Frequency, anchor: Date): { start: string; end: string } {
  const daysBack = frequency === "Weekly" ? 6 : frequency === "Monthly" ? 29 : 89;
  return { start: toIsoDate(addDays(anchor, -daysBack)), end: toIsoDate(anchor) };
}

/**
 * Whether a configuration's schedule is due on `date`. Weekly fires every
 * matching weekday; Monthly/Quarterly fire on the first matching weekday of
 * the month/quarter (so a daily cron checking this only fires them once).
 */
export function isDueOn(frequency: Frequency, submissionDay: Weekday, date: Date): boolean {
  if (WEEKDAYS[date.getUTCDay()] !== submissionDay) return false;
  if (frequency === "Weekly") return true;
  if (frequency === "Monthly") return date.getUTCDate() <= 7;
  return date.getUTCDate() <= 7 && [0, 3, 6, 9].includes(date.getUTCMonth());
}
