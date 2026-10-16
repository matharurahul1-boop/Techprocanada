import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { DataList } from "@/components/DataList";
import { useConfirmDelete } from "@/components/confirm-delete";
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
  const { assignments, items, toolTypes, users, machines } = useStore();
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

  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const askDelete = (row: { id: string; toolName: string; recipientName: string }) =>
    confirmDelete({
      title: `Delete this record (${row.toolName} → ${row.recipientName})?`,
      description: "The item's issued count will be restored.",
      onConfirm: () => {
        removeAssignment(row.id);
        setDetailId((current) => (current === row.id ? null : current));
      },
    });

  type LogRow = (typeof rows)[number];

  const rowActions = (row: LogRow) => (
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

          <DataList
            rows={rows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "records" }}
            rowKey={(row) => row.id}
            breakpoint="xl"
            minWidth="78rem"
            onRowClick={(row) => setDetailId(row.id)}
            empty={
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">{hasFilters ? "No matching records" : "No assignments yet"}</p>
                <p className="mt-1 text-[12px] text-muted-fg">
                  {hasFilters ? "Try clearing or changing the filters." : "Assignments saved from Inventory Items will appear here."}
                </p>
              </div>
            }
            columns={[
              {
                header: "Item",
                sortValue: (row) => row.toolName,
                width: "minmax(11rem,1.3fr)",
                cell: (row) => <p className="truncate text-sm font-semibold">{row.toolName}</p>,
              },
              {
                header: "Tool type",
                filter: "select",
                sortValue: (row) => row.toolType,
                width: "minmax(7rem,0.7fr)",
                cell: (row) => <span className="block truncate text-[12px] text-muted-fg">{row.toolType}</span>,
              },
              {
                header: "Issued date",
                sortValue: (row) => row.issuedDate,
                width: "6.5rem",
                cell: (row) => <span className="font-mono text-[12px]">{formatDate(row.issuedDate)}</span>,
              },
              {
                header: "Issued",
                sortValue: (row) => row.qtyIssued,
                width: "4.5rem",
                align: "right",
                cell: (row) => <span className="font-mono text-[13px] text-muted-fg">{row.qtyIssued}</span>,
              },
              {
                header: "Balance",
                sortValue: (row) => row.balance,
                width: "4.5rem",
                align: "right",
                cell: (row) => <span className="font-mono text-[13px] font-semibold">{row.balance}</span>,
              },
              {
                header: "Issued to",
                filter: "select",
                sortValue: (row) => row.recipientName,
                width: "minmax(8rem,0.8fr)",
                cell: (row) => (
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-chip text-[10px] font-bold text-accent-brand">
                      {row.recipientName.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-[13px]">{row.recipientName}</span>
                  </div>
                ),
              },
              {
                header: "Location / Machine",
                filter: "select",
                sortValue: (row) => [row.location, row.machineName].filter(Boolean).join(" "),
                width: "minmax(8rem,0.8fr)",
                cell: (row) => (
                  <span className="block truncate text-[12px] text-muted-fg">
                    {[row.location, row.machineName].filter(Boolean).join(" · ") || "—"}
                  </span>
                ),
              },
              {
                header: "Job no.",
                sortValue: (row) => row.jobNumber,
                width: "minmax(6rem,0.6fr)",
                cell: (row) => <span className="block truncate font-mono text-[12px]">{row.jobNumber || "—"}</span>,
              },
              {
                header: "Drawing no.",
                sortValue: (row) => row.drawingNumber,
                width: "minmax(6rem,0.6fr)",
                cell: (row) => <span className="block truncate font-mono text-[12px]">{row.drawingNumber || "—"}</span>,
              },
              { header: "Actions", width: "5.5rem", align: "center", cell: rowActions },
            ]}
            card={(row) => (
              <>
                <p className="truncate text-sm font-semibold">{row.toolName}</p>
                <p className="truncate text-[12px] text-muted-fg">{row.toolType}</p>
                <div className="mt-2 flex items-center gap-4">
                  <div><p className="text-[10px] uppercase text-muted-fg">Date</p><p className="font-mono text-[11px]">{formatDate(row.issuedDate)}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-fg">Issued</p><p className="font-mono text-[11px] font-semibold">{row.qtyIssued}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-fg">Balance</p><p className="font-mono text-[11px] font-semibold">{row.balance}</p></div>
                </div>
                <p className="mt-2 text-[12px]">Issued to <span className="font-semibold">{row.recipientName}</span></p>
                {(row.location || row.machineName) && (
                  <p className="mt-1 text-[12px] text-muted-fg">
                    {[row.location, row.machineName].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(row.jobNumber || row.drawingNumber) && (
                  <p className="mt-1 font-mono text-[11px] text-muted-fg">
                    {row.jobNumber && <>Job {row.jobNumber}</>}
                    {row.jobNumber && row.drawingNumber ? " · " : ""}
                    {row.drawingNumber && <>Dwg {row.drawingNumber}</>}
                  </p>
                )}
                <div className="mt-2 flex justify-end">{rowActions(row)}</div>
              </>
            )}
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
      {confirmDialog}
    </Shell>
  );
}
