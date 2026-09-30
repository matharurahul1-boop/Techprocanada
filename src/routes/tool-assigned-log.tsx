import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";
import { DetailSheet, EditAssignmentSheet, formatDate } from "@/components/edit-sheets";
import { balanceOf, removeAssignment, useStore, type ToolAssignment } from "@/lib/store";

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
  const { assignments, items, toolTypes, users, machines, brands } = useStore();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<PresetKey>("all");
  const [quantity, setQuantity] = useState("");
  const [tool, setTool] = useState("");
  const [type, setType] = useState("");
  const [recipient, setRecipient] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

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

  const detailRow = rows.find((row) => row.id === detailId) ?? null;
  const editAssignment: ToolAssignment | null = assignments.find((a) => a.id === editId) ?? null;
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "";

  const askDelete = (row: { id: string; toolName: string; recipientName: string }) => {
    if (window.confirm(`Delete this record (${row.toolName} -> ${row.recipientName})? The item's issued count will be restored.`)) {
      removeAssignment(row.id);
      setDetailId((current) => (current === row.id ? null : current));
    }
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

          <div className="glass-surface overflow-x-auto rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden min-w-[78rem] items-center gap-3 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg xl:grid xl:grid-cols-[minmax(11rem,1.3fr)_minmax(7rem,0.7fr)_6.5rem_4.5rem_4.5rem_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_minmax(6rem,0.6fr)_minmax(6rem,0.6fr)_5.5rem]">
              <span>Item</span>
              <span>Tool type</span>
              <span>Issued date</span>
              <span className="text-right">Issued</span>
              <span className="text-right">Balance</span>
              <span>Issued to</span>
              <span>Location / Machine</span>
              <span>Job no.</span>
              <span>Drawing no.</span>
              <span className="text-center">Actions</span>
            </div>

            {visibleRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">{hasFilters ? "No matching records" : "No assignments yet"}</p>
                <p className="mt-1 text-[12px] text-muted-fg">{hasFilters ? "Try clearing or changing the filters." : "Assignments saved from Inventory Items will appear here."}</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visibleRows.map((row) => {
                  const actions = (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditId(row.id);
                        }}
                        aria-label={`Edit assignment of ${row.toolName}`}
                        title="Edit"
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          askDelete(row);
                        }}
                        aria-label={`Delete assignment of ${row.toolName}`}
                        title="Delete"
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                  return (
                    <article
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailId(row.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDetailId(row.id);
                        }
                      }}
                      className="cursor-pointer px-4 py-3.5 transition-colors hover:bg-panel/40 xl:grid xl:min-w-[78rem] xl:grid-cols-[minmax(11rem,1.3fr)_minmax(7rem,0.7fr)_6.5rem_4.5rem_4.5rem_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)_minmax(6rem,0.6fr)_minmax(6rem,0.6fr)_5.5rem] xl:items-center xl:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.toolName}</p>
                        <p className="truncate text-[12px] text-muted-fg xl:hidden">{row.toolType}</p>
                      </div>
                      <span className="hidden truncate text-[12px] text-muted-fg xl:block">{row.toolType}</span>
                      <span className="hidden font-mono text-[12px] xl:block">{formatDate(row.issuedDate)}</span>
                      <span className="hidden text-right font-mono text-[13px] text-muted-fg xl:block">{row.qtyIssued}</span>
                      <span className="hidden text-right font-mono text-[13px] font-semibold xl:block">{row.balance}</span>
                      <div className="hidden min-w-0 items-center gap-2 xl:flex">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-chip text-[10px] font-bold text-accent-brand">{row.recipientName.charAt(0).toUpperCase()}</span>
                        <span className="truncate text-[13px]">{row.recipientName}</span>
                      </div>
                      <span className="hidden truncate text-[12px] text-muted-fg xl:block">
                        {[row.location, row.machineName].filter(Boolean).join(" · ") || "—"}
                      </span>
                      <span className="hidden truncate font-mono text-[12px] xl:block">{row.jobNumber || "—"}</span>
                      <span className="hidden truncate font-mono text-[12px] xl:block">{row.drawingNumber || "—"}</span>
                      <div className="hidden xl:block">{actions}</div>

                      <div className="mt-2 flex items-center gap-4 xl:hidden">
                        <div><p className="text-[10px] uppercase text-muted-fg">Date</p><p className="font-mono text-[11px]">{formatDate(row.issuedDate)}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-fg">Issued</p><p className="font-mono text-[11px] font-semibold">{row.qtyIssued}</p></div>
                        <div><p className="text-[10px] uppercase text-muted-fg">Balance</p><p className="font-mono text-[11px] font-semibold">{row.balance}</p></div>
                      </div>
                      <p className="mt-2 text-[12px] xl:hidden">Issued to <span className="font-semibold">{row.recipientName}</span></p>
                      {(row.location || row.machineName) && (
                        <p className="mt-1 text-[12px] text-muted-fg xl:hidden">
                          {[row.location, row.machineName].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {(row.jobNumber || row.drawingNumber) && (
                        <p className="mt-1 font-mono text-[11px] text-muted-fg xl:hidden">
                          {row.jobNumber && <>Job {row.jobNumber}</>}
                          {row.jobNumber && row.drawingNumber ? " · " : ""}
                          {row.drawingNumber && <>Dwg {row.drawingNumber}</>}
                        </p>
                      )}
                      <div className="mt-2 flex justify-end xl:hidden">{actions}</div>
                    </article>
                  );
                })}
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

      <DetailSheet
        open={!!detailRow}
        title="Assignment details"
        subtitle={detailRow?.toolName}
        onClose={() => setDetailId(null)}
        rows={
          detailRow
            ? [
                ["Item taken", detailRow.toolName],
                ["Tool type", detailRow.toolType],
                ["Issued to", detailRow.recipientName],
                ["Issued date", formatDate(detailRow.issuedDate)],
                ["Qty issued", String(detailRow.qtyIssued)],
                ["Balance now", String(detailRow.balance)],
                ["Brand", brandName(detailRow.brandId)],
                ["Location", detailRow.location],
                ["Machine", detailRow.machineName],
                ["Job no.", detailRow.jobNumber],
                ["Drawing no.", detailRow.drawingNumber],
                ["Remarks", detailRow.remarks],
              ]
            : []
        }
        actions={
          detailRow && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditId(detailRow.id);
                  setDetailId(null);
                }}
                className="brand-gradient inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-accent-brand-ink"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                onClick={() => askDelete(detailRow)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-warn-soft text-sm font-semibold text-warn"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )
        }
      />
      <EditAssignmentSheet assignment={editAssignment} onClose={() => setEditId(null)} />
    </Shell>
  );
}
