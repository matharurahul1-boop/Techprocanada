import { Link } from "@tanstack/react-router";
import { Timer, X } from "lucide-react";
import { useEffect } from "react";

/** Read an optional id / text value from URL search params (numbers arrive parsed). */
export const searchText = (value: unknown) =>
  typeof value === "string" && value
    ? value
    : typeof value === "number"
      ? String(value)
      : undefined;

/** Read the ?add flag that asks a page to open its "new" form straight away. */
export const searchFlag = (value: unknown) => (value === true ? true : undefined);

/**
 * Opens the page's "new" form once when it was reached with ?add (the step after
 * saving a row on the previous table), then drops the flag from the URL.
 */
export function useOpenOnAdd(add: boolean | undefined, open: () => void, clear: () => void) {
  useEffect(() => {
    if (!add) return;
    open();
    clear();
    // Runs only when the flag appears; open/clear are recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add]);
}

// Round icon button style for the row links that open a related table.
const drillLinkClass =
  "grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink";

/** Row link: Machining Hours for a job, optionally narrowed to a drawing number. */
export function MachiningHoursLink({
  search,
}: {
  // Null when the row has no job to filter by; the icon is then shown disabled.
  search: { job: string; drawing?: string | undefined } | null;
}) {
  return search ? (
    <Link
      to="/machining-hours"
      search={search}
      aria-label="Open machining hours"
      title="Machining hours"
      className={drillLinkClass}
    >
      <Timer size={14} />
    </Link>
  ) : (
    <span
      title="No job or drawing on this row"
      className={`${drillLinkClass} pointer-events-none opacity-40`}
    >
      <Timer size={14} />
    </span>
  );
}

/** Shown above a list that was opened filtered from another table. */
export function FilterBanner({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-chip py-1 pr-1 pl-3 text-[12px] font-semibold">
        <span className="truncate">{label}</span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear filter and show all"
          title="Show all"
          className="grid size-5 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
        >
          <X size={12} />
        </button>
      </span>
    </div>
  );
}
