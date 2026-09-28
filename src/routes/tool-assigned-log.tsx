import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";
import { balanceOf, useStore } from "@/lib/store";

const PAGE_SIZE = 15;

const toISODate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type PresetKey = "all" | "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";

function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (key === "today") {
    const d = toISODate(now);
    return { from: d, to: d };
  }
  if (key === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = toISODate(y);
    return { from: d, to: d };
  }
  if (key === "thisWeek") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: toISODate(start), to: toISODate(end) };
  }
  if (key === "lastWeek") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - start.getDay() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: toISODate(start), to: toISODate(end) };
  }
  if (key === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toISODate(start), to: toISODate(end) };
  }
  if (key === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISODate(start), to: toISODate(end) };
  }
  return { from: "", to: "" };
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
];

export const Route = createFileRoute("/tool-assigned-log")({
  head: () => ({
    meta: [
      { title: "Tool Assigned Log — TechPro Inventory Console" },
      {
        name: "description",
        content: "Review and filter TechPro tool assignment and stock withdrawal records.",
      },
      { property: "og:title", content: "Tool Assigned Log — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Review issued tools, quantities, balances, dates and recipients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolAssignedLogPage,
});

export function ToolAssignedLogPage({
  eyebrow = "Assignment history",
  title = "Tool Assigned Log",
}: {
  eyebrow?: string;
  title?: string;
} = {}) {
  const { assignments, items, toolTypes, users, machines } = useStore();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<PresetKey>("all");
  const [quantity, setQuantity] = useState("");
  const [tool, setTool] = useState("");
  const [type, setType] = useState("");
  const [recipient, setRecipient] = useState("");
  const [page, setPage] = useState(1);

  const applyPreset = (key: PresetKey) => {
    setActivePreset(key);
    const { from, to } = presetRange(key);
    setDateFrom(from);
    setDateTo(to);
  };

  const rows = useMemo(() => {
    const itemById = new Map(items.map((item) => [item.id, item]));
    const typeById = new Map(toolTypes.map((toolType) => [toolType.id, toolType.name]));
    const userById = new Map(users.map((user) => [user.id, user.name]));
    const machineById = new Map(machines.map((machine) => [machine.id, machine.name]));

    return assignments
      .map((assignment, sourceIndex) => {
        const item = itemById.get(assignment.itemId);
        return {
          ...assignment,
          sourceIndex,
          toolName: item?.name ?? "Removed item",
          toolType: item ? (typeById.get(item.typeId) ?? "Unassigned") : "Unassigned",
          balance: item ? balanceOf(item) : 0,
          recipientName: userById.get(assignment.userId) ?? "Removed user",
          machineName: assignment.machineId ? (machineById.get(assignment.machineId) ?? "") : "",
        };
      })
      .sort((a, b) => b.issuedDate.localeCompare(a.issuedDate) || a.sourceIndex - b.sourceIndex)
      .filter((row) => {
        const quantityMatch = !quantity || row.qtyIssued === Number(quantity);
        return (
          (!dateFrom || row.issuedDate >= dateFrom) &&
          (!dateTo || row.issuedDate <= dateTo) &&
          quantityMatch &&
          row.toolName.toLowerCase().includes(tool.trim().toLowerCase()) &&
          row.toolType.toLowerCase().includes(type.trim().toLowerCase()) &&
          row.recipientName.toLowerCase().includes(recipient.trim().toLowerCase())
        );
      });
  }, [assignments, dateFrom, dateTo, items, machines, quantity, recipient, tool, toolTypes, type, users]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = Boolean(dateFrom || dateTo || quantity || tool || type || recipient);

  useEffect(() => setPage(1), [dateFrom, dateTo, quantity, tool, type, recipient]);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setActivePreset("all");
    setQuantity("");
    setTool("");
    setType("");
    setRecipient("");
  };

  const formatDate = (value: string) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  return (
    <Shell eyebrow={eyebrow} title={title}>
      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Assigned tools</h2>
            <span className="font-mono text-[12px] text-muted-fg">
              {rows.length} of {assignments.length} records
            </span>
          </div>

          <div className="glass-surface mb-3 grid gap-2 rounded-xl border p-2 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(5,minmax(7rem,0.55fr))_auto]">
            <label className="relative block">
              <span className="sr-only">Filter by tool name</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
              <input aria-label="Filter by tool name" value={tool} onChange={(event) => setTool(event.target.value)} placeholder="Search tools" className={`${fieldClass} pl-9`} />
            </label>
            <input aria-label="Filter by tool type" value={type} onChange={(event) => setType(event.target.value)} placeholder="Tool type" className={fieldClass} />
            <input aria-label="Filter by recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Issued to" className={fieldClass} />
            <input aria-label="Filter by quantity" type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" className={fieldClass} />
            <input
              aria-label="Filter from date"
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setActivePreset("all");
                setDateFrom(event.target.value);
              }}
              className={fieldClass}
            />
            <input
              aria-label="Filter to date"
              type="date"
              value={dateTo}
              onChange={(event) => {
                setActivePreset("all");
                setDateTo(event.target.value);
              }}
              className={fieldClass}
            />
            {hasFilters && (
              <button type="button" onClick={clearFilters} aria-label="Clear filters" title="Clear filters" className="grid size-10 place-items-center self-center rounded-lg text-muted-fg transition hover:bg-chip hover:text-ink">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset.key)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${
                  activePreset === preset.key
                    ? "bg-accent-brand text-accent-brand-ink ring-accent-brand"
                    : "bg-panel text-muted-fg ring-line hover:text-ink"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden grid-cols-[minmax(12rem,1.3fr)_minmax(8rem,0.7fr)_7rem_6rem_6rem_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)] items-center gap-4 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
              <span>Item</span>
              <span>Tool type</span>
              <span>Issued date</span>
              <span className="text-right">Issued</span>
              <span className="text-right">Balance</span>
              <span>Issued to</span>
              <span>Location / Machine</span>
            </div>

            {visibleRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">{hasFilters ? "No matching records" : "No assignments yet"}</p>
                <p className="mt-1 text-[12px] text-muted-fg">{hasFilters ? "Try clearing or changing the filters." : "Assignments saved from Inventory Items will appear here."}</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visibleRows.map((row, index) => (
                  <article key={row.id} className="px-4 py-3.5 lg:grid lg:grid-cols-[minmax(12rem,1.3fr)_minmax(8rem,0.7fr)_7rem_6rem_6rem_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)] lg:items-center lg:gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.toolName}</p>
                      <p className="truncate text-[12px] text-muted-fg lg:hidden">{row.toolType}</p>
                    </div>
                    <span className="hidden truncate text-[12px] text-muted-fg lg:block">{row.toolType}</span>
                    <span className="hidden font-mono text-[12px] lg:block">{formatDate(row.issuedDate)}</span>
                    <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">{row.qtyIssued}</span>
                    <span className="hidden text-right font-mono text-[13px] font-semibold lg:block">{row.balance}</span>
                    <div className="hidden min-w-0 items-center gap-2 lg:flex">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-chip text-[10px] font-bold text-accent-brand">{row.recipientName.charAt(0).toUpperCase()}</span>
                      <span className="truncate text-[13px]">{row.recipientName}</span>
                    </div>
                    <span className="hidden truncate text-[12px] text-muted-fg lg:block">
                      {[row.location, row.machineName].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <div className="mt-2 flex items-center gap-4 lg:hidden">
                      <div><p className="text-[10px] uppercase text-muted-fg">Date</p><p className="font-mono text-[11px]">{formatDate(row.issuedDate)}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-fg">Issued</p><p className="font-mono text-[11px] font-semibold">{row.qtyIssued}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-fg">Balance</p><p className="font-mono text-[11px] font-semibold">{row.balance}</p></div>
                    </div>
                    <p className="mt-2 text-[12px] lg:hidden">Issued to <span className="font-semibold">{row.recipientName}</span> from {row.issuedFrom}</p>
                    {(row.location || row.machineName) && (
                      <p className="mt-1 text-[12px] text-muted-fg lg:hidden">
                        {[row.location, row.machineName].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={rows.length}
            pageSize={PAGE_SIZE}
            itemLabel="records"
          />
        </section>
      </div>
    </Shell>
  );
}