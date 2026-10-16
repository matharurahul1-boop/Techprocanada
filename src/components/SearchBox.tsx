import { Search, X } from "lucide-react";

import { fieldClass } from "@/components/Shell";

/** Search field shown above a list; the page does the filtering. */
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    // Same look as the Tools Order Log filter bar.
    <div className="glass-surface relative mb-3 rounded-xl border p-2">
      <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-fg" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${fieldClass} pr-10 pl-9`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-4 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-fg transition hover:bg-chip hover:text-ink"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/** True when every word typed appears somewhere in `text` (ignoring case). */
export const matchesSearch = (query: string, text: string) => {
  const haystack = text.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};
