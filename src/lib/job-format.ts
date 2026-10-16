// Formatting helpers shared by the Job-tab pages and their forms.

// ── Durations (stored as minutes, entered and shown as h:mm) ────────────────

/** "12:30" or "1.5" → minutes; "" → null; anything else → NaN. */
export const parseDuration = (value: string): number | null => {
  const text = value.trim();
  if (!text) return null;
  const hm = text.match(/^(\d+):([0-5]?\d)$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text) * 60);
  return NaN;
};

export const formatDuration = (minutes: number | null) =>
  minutes === null ? "—" : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Quoted − actual, as the old system worked it out: positive = still within the quote,
 * negative = over it. A missing side counts as 0; null when neither is set.
 */
export const varianceOf = (quoted: number | null, actual: number | null) =>
  quoted == null && actual == null ? null : (quoted ?? 0) - (actual ?? 0);

export const formatVariance = (variance: number | null) =>
  variance === null
    ? "—"
    : `${variance > 0 ? "+" : variance < 0 ? "−" : ""}${formatDuration(Math.abs(variance))}`;

export const varianceTone = (variance: number | null) =>
  variance === null || variance === 0
    ? "text-muted-fg"
    : variance > 0
      ? "text-good"
      : "text-destructive";

// ── Dates and files ─────────────────────────────────────────────────────────

/** Today's date (local time) as YYYY-MM-DD. */
export const today = () => {
  const now = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
};

/**
 * Days left / behind, as the old system worked it out: counted from today to the due
 * date (positive = days left, negative = days behind, 0 on the due date), and 0 until
 * the job's start date. Null when either date is missing.
 */
export const daysLeft = (date: string, dueDate: string) => {
  if (!date || !dueDate) return null;
  const now = today();
  if (now < date) return 0;
  return Math.round((Date.parse(dueDate) - Date.parse(now)) / 86_400_000);
};

/** USD to CAD rate the old system used for a job's PO amount. */
export const USD_TO_CAD = 1.37;

/** PO amount in CAD: the amount itself, or converted when it is in USD (currency 2). */
export const poAmountFor = (amount: number | null, currency: number | null) =>
  amount === null ? null : currency === 2 ? Math.round(amount * USD_TO_CAD * 100) / 100 : amount;

/** "2026-10-13" → "13/10/2026" (day/month/year, used in every table); "—" when blank. */
export const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

/** ISO timestamp → "13/10/2026, 14:05" in local time; "—" when blank or invalid. */
export const formatSubmitted = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}, ${two(date.getHours())}:${two(date.getMinutes())}`;
};

/** Storage path → the original file name. */
export const fileName = (path: string) => path.split("/").pop() ?? path;
