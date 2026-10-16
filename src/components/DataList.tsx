import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from "lucide-react";

import { Pagination } from "@/components/Pagination";
import { fieldClass } from "@/components/Shell";

export type DataListColumn<T> = {
  header: ReactNode;
  /** CSS grid track for this column, e.g. "minmax(10rem,1fr)" or "6rem". */
  width: string;
  align?: "left" | "right" | "center";
  cell: (row: T) => ReactNode;
  /** Makes the column sortable by clicking its header. */
  sortValue?: (row: T) => string | number;
  className?: string;
  /**
   * Adds a filter for this column above the list: "toggle" for yes/no columns
   * (All / Yes / No), "select" for a dropdown of the column's distinct values.
   */
  filter?: "toggle" | "select";
  /** Value the filter reads; defaults to `sortValue`. */
  filterValue?: (row: T) => string | number | boolean;
  /** Filter label when `header` isn't plain text. */
  filterLabel?: string;
};

type Sort = { index: number; dir: "asc" | "desc" };

// Literal class strings per breakpoint so Tailwind can see them. The grid
// template and minimum width come from CSS variables set on the container.
// Below the breakpoint rows are floating cards; at it they become flat grid rows.
const BREAKPOINTS = {
  lg: {
    inner: "lg:min-w-(--data-list-min)",
    header: "hidden lg:grid lg:grid-cols-(--data-list-cols) lg:gap-4",
    list: "space-y-2 p-2 lg:space-y-0 lg:divide-y lg:divide-line lg:p-0",
    item: "rounded-xl bg-panel/60 p-3.5 shadow-sm ring-1 ring-line/60 lg:rounded-none lg:bg-transparent lg:px-4 lg:py-3.5 lg:shadow-none lg:ring-0",
    row: "hidden lg:grid lg:grid-cols-(--data-list-cols) lg:items-center lg:gap-4",
    card: "lg:hidden",
  },
  xl: {
    inner: "xl:min-w-(--data-list-min)",
    header: "hidden xl:grid xl:grid-cols-(--data-list-cols) xl:gap-3",
    list: "space-y-2 p-2 xl:space-y-0 xl:divide-y xl:divide-line xl:p-0",
    item: "rounded-xl bg-panel/60 p-3.5 shadow-sm ring-1 ring-line/60 xl:rounded-none xl:bg-transparent xl:px-4 xl:py-3.5 xl:shadow-none xl:ring-0",
    row: "hidden xl:grid xl:grid-cols-(--data-list-cols) xl:items-center xl:gap-3",
    card: "xl:hidden",
  },
} as const;

const ALIGN = { left: "", right: "text-right tabular-nums", center: "text-center" } as const;

const compare = (a: string | number, b: string | number) =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

/**
 * Glass list used across the console: a header row and grid columns on wide
 * screens, floating cards (rendered by `card`) below the breakpoint. Handles
 * column sorting and, when `pagination` is given, slicing rows into pages.
 * With `searchable`, a search box filters rows on the values of every sortable column.
 */
export function DataList<T>({
  rows,
  rowKey,
  columns,
  card,
  empty,
  breakpoint = "lg",
  minWidth,
  onRowClick,
  pagination,
  searchable = false,
  onResultsChange,
}: {
  rows: T[];
  rowKey: (row: T) => string;
  columns: DataListColumn<T>[];
  card: (row: T) => ReactNode;
  empty: ReactNode;
  breakpoint?: "lg" | "xl";
  /** Desktop minimum width; the list scrolls horizontally below it. */
  minWidth?: string;
  onRowClick?: (row: T) => void;
  /** Show a search box above the list. */
  searchable?: boolean;
  /** Told the rows left after the search and filters (all pages), whenever they change. */
  onResultsChange?: (rows: T[]) => void;
  pagination?: {
    page: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    itemLabel: string;
  };
}) {
  const bp = BREAKPOINTS[breakpoint];
  const [sort, setSort] = useState<Sort | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });
  const [query, setQuery] = useState("");
  // Chosen filter value per column index: "" = all; toggles use "yes" / "no".
  const [filters, setFilters] = useState<Record<number, string>>({});

  const readFilter = (column: DataListColumn<T>, row: T) =>
    (column.filterValue ?? column.sortValue)?.(row) ?? "";
  const filterColumns = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => column.filter);
  const label = (column: DataListColumn<T>) =>
    column.filterLabel ?? (typeof column.header === "string" ? column.header : "Filter");
  const optionsFor = (column: DataListColumn<T>) =>
    [...new Set(rows.map((row) => String(readFilter(column, row))).filter((v) => v !== ""))].sort(
      (a, b) => compare(a, b),
    );
  const filtered = rows.filter((row) =>
    filterColumns.every(({ column, index }) => {
      const chosen = filters[index];
      if (!chosen) return true;
      const value = readFilter(column, row);
      if (column.filter === "toggle") return Boolean(value && value !== "0") === (chosen === "yes");
      return String(value) === chosen;
    }),
  );
  const setFilter = (index: number, value: string) => {
    setFilters((current) => ({ ...current, [index]: value }));
    pagination?.onPageChange(1);
  };
  const activeFilters = Object.values(filters).some(Boolean);

  // Search looks at every sortable column's value; each word typed must appear in the row.
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searched =
    words.length === 0
      ? filtered
      : filtered.filter((row) => {
          const text = columns
            .map((column) => (column.sortValue ? String(column.sortValue(row)) : ""))
            .join(" ")
            .toLowerCase();
          return words.every((word) => text.includes(word));
        });
  // Reported by key, so a parent that stores the result doesn't loop on new array identities.
  const resultsKey = searched.map(rowKey).join("|");
  const latestResults = useRef(searched);
  latestResults.current = searched;
  useEffect(() => {
    onResultsChange?.(latestResults.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsKey]);

  const changeQuery = (next: string) => {
    setQuery(next);
    pagination?.onPageChange(1);
  };

  // Sort the full list (not just the current page), then slice into pages.
  const sortValue = sort ? columns[sort.index]?.sortValue : undefined;
  const sorted =
    sort && sortValue
      ? [...searched].sort((a, b) => {
          const va = sortValue(a);
          const vb = sortValue(b);
          // Blank values always sink to the bottom.
          if (va === "" || vb === "") return va === vb ? 0 : va === "" ? 1 : -1;
          return sort.dir === "asc" ? compare(va, vb) : compare(vb, va);
        })
      : searched;

  const pageSize = pagination?.pageSize ?? Math.max(sorted.length, 1);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(pagination?.page ?? 1, pageCount);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (index: number) => {
    setSort((current) =>
      current?.index !== index
        ? { index, dir: "asc" }
        : current.dir === "asc"
          ? { index, dir: "desc" }
          : null,
    );
    pagination?.onPageChange(1);
  };

  // Edge fades that hint at more columns when the list scrolls sideways.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !minWidth) return;
    const update = () =>
      setFade({
        left: el.scrollLeft > 1,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [minWidth]);

  const style = {
    "--data-list-cols": columns.map((column) => column.width).join(" "),
    "--data-list-min": minWidth ?? "0px",
  } as CSSProperties;

  return (
    <>
      {/* Same look as the Tools Order Log filter bar: one glass panel holding the search
          field and every filter as a full-size field, with an × to clear them all. */}
      {(searchable || filterColumns.length > 0) && (
        <div className="glass-surface mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-2">
          {searchable && (
            <label className="relative block min-w-[12rem] flex-[2_1_14rem]">
              <span className="sr-only">Search this table</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
              <input
                aria-label="Search this table"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                placeholder="Search"
                className={`${fieldClass} pl-9`}
              />
            </label>
          )}
          {filterColumns.map(({ column, index }) => (
            <select
              key={index}
              aria-label={`Filter by ${label(column)}`}
              value={filters[index] ?? ""}
              onChange={(event) => setFilter(index, event.target.value)}
              className={`${fieldClass} min-w-[8rem] flex-[1_1_9rem] ${filters[index] ? "font-semibold text-ink" : "text-muted-fg"}`}
            >
              {column.filter === "toggle" ? (
                <>
                  <option value="">{label(column)}: All</option>
                  <option value="yes">{label(column)}: Yes</option>
                  <option value="no">{label(column)}: No</option>
                </>
              ) : (
                <>
                  <option value="">{label(column)}</option>
                  {optionsFor(column).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </>
              )}
            </select>
          ))}
          {(activeFilters || query) && (
            <button
              type="button"
              onClick={() => {
                setFilters({});
                changeQuery("");
              }}
              aria-label="Clear filters"
              title="Clear filters"
              className="grid size-10 place-items-center self-center rounded-lg text-muted-fg transition hover:bg-chip hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      <div
        style={style}
        className="glass-surface relative overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5"
      >
        <div ref={scrollerRef} className={minWidth ? "overflow-x-auto" : undefined}>
          <div className={bp.inner}>
            <div
              className={`${bp.header} items-center border-b border-line bg-chip/40 px-4 py-2.5 text-[11px] font-medium text-muted-fg`}
            >
              {columns.map((column, index) => {
                const align = ALIGN[column.align ?? "left"];
                if (!column.sortValue) {
                  return (
                    <span key={index} className={align}>
                      {column.header}
                    </span>
                  );
                }
                const active = sort?.index === index;
                const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <span
                    key={index}
                    className={align}
                    aria-sort={!active ? "none" : sort.dir === "asc" ? "ascending" : "descending"}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(index)}
                      className={`inline-flex items-center gap-1 rounded transition hover:text-ink focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none ${active ? "text-ink" : ""}`}
                    >
                      {column.header}
                      <Icon
                        size={12}
                        className={active ? "text-accent-brand" : "opacity-50"}
                        aria-hidden="true"
                      />
                    </button>
                  </span>
                );
              })}
            </div>

            {visible.length === 0 ? (
              (words.length > 0 || activeFilters) && rows.length > 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-fg">
                  Nothing matches the search or filters.
                </p>
              ) : (
                empty
              )
            ) : (
              <div className={bp.list}>
                {visible.map((row) => (
                  <div
                    key={rowKey(row)}
                    {...(onRowClick && {
                      role: "button",
                      tabIndex: 0,
                      onClick: () => onRowClick(row),
                      onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      },
                    })}
                    className={`${bp.item} relative transition-colors before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent-brand before:opacity-0 before:transition-opacity hover:bg-panel/50 hover:before:opacity-100 focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none focus-visible:ring-inset ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    <div className={bp.card}>{card(row)}</div>
                    <div className={bp.row}>
                      {columns.map((column, index) => (
                        <div
                          key={index}
                          className={`min-w-0 ${ALIGN[column.align ?? "left"]} ${column.className ?? ""}`}
                        >
                          {column.cell(row)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {fade.left && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-panel/90 to-transparent" />
        )}
        {fade.right && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-panel/90 to-transparent" />
        )}
      </div>

      {pagination && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={pagination.onPageChange}
          totalCount={sorted.length}
          pageSize={pageSize}
          itemLabel={pagination.itemLabel}
        />
      )}
    </>
  );
}
