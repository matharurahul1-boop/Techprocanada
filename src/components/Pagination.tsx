import { ChevronLeft, ChevronRight } from "lucide-react";

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const withEllipsis: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) withEllipsis.push("…");
    withEllipsis.push(p);
    prev = p;
  }
  return withEllipsis;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  totalCount,
  pageSize,
  itemLabel = "records",
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  pageSize: number;
  itemLabel?: string;
}) {
  if (pageCount <= 1) return null;

  const firstShown = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, totalCount);
  const pageNumbers = getPageNumbers(page, pageCount);

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <p className="font-mono text-[11px] text-muted-fg">
        {firstShown}–{lastShown} of {totalCount} {itemLabel}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Previous page"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-panel text-muted-fg ring-1 ring-line transition hover:text-ink disabled:opacity-35"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="font-mono text-[12px] font-semibold sm:hidden">
          {page} / {pageCount}
        </span>

        <div className="hidden items-center gap-1.5 sm:flex">
          {pageNumbers.map((entry, index) =>
            entry === "…" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-[12px] text-muted-fg">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-label={`Page ${entry}`}
                aria-current={page === entry ? "page" : undefined}
                className={`grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold ring-1 transition ${
                  page === entry
                    ? "bg-accent-brand text-accent-brand-ink ring-accent-brand"
                    : "bg-panel text-muted-fg ring-line hover:text-ink"
                }`}
              >
                {entry}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          aria-label="Next page"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-panel text-muted-fg ring-1 ring-line transition hover:text-ink disabled:opacity-35"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
