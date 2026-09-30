import { createFileRoute } from "@tanstack/react-router";
import { FileText, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";
import { DetailSheet, EditOrderSheet, formatDate } from "@/components/edit-sheets";
import { removeOrder, updateOrder, useStore } from "@/lib/store";

const PAGE_SIZE = 15;
const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export const Route = createFileRoute("/tools-order-log")({
  head: () => ({
    meta: [
      { title: "Tools Order Log — TechPro Inventory Console" },
      {
        name: "description",
        content: "Review and filter TechPro tool purchase and inventory order records.",
      },
      { property: "og:title", content: "Tools Order Log — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Review ordered tools, brands, quantities, amounts, documents and purchase dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolsOrderLogPage,
});

function ToolsOrderLogPage() {
  const { orders, items, brands } = useStore();
  const [tool, setTool] = useState("");
  const [brand, setBrand] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const itemById = new Map(items.map((item) => [item.id, item.name]));
    const brandById = new Map(brands.map((entry) => [entry.id, entry.name]));
    const runningQuantity = new Map<string, number>();
    const sourceRows = orders.map((order, sourceIndex) => ({ order, sourceIndex }));
    const totals = new Map<string, { previousQty: number; totalQty: number }>();

    [...sourceRows]
      .sort(
        (a, b) =>
          a.order.purchaseDate.localeCompare(b.order.purchaseDate) ||
          b.sourceIndex - a.sourceIndex,
      )
      .forEach(({ order }) => {
        const previousQty = runningQuantity.get(order.itemId) ?? 0;
        const totalQty = previousQty + order.qtyOrdered;
        totals.set(order.id, { previousQty, totalQty });
        runningQuantity.set(order.itemId, totalQty);
      });

    return sourceRows
      .map(({ order, sourceIndex }) => ({
        ...order,
        sourceIndex,
        toolName: itemById.get(order.itemId) ?? "Removed item",
        brandName: brandById.get(order.brandId) ?? "Removed brand",
        previousQty: totals.get(order.id)?.previousQty ?? 0,
        totalQty: totals.get(order.id)?.totalQty ?? order.qtyOrdered,
      }))
      .sort(
        (a, b) =>
          b.purchaseDate.localeCompare(a.purchaseDate) || a.sourceIndex - b.sourceIndex,
      )
      .filter((row) => {
        const quantityMatch = !quantity || row.qtyOrdered === Number(quantity);
        const amountMatch = !amount || row.amount === Number(amount);
        return (
          row.toolName.toLowerCase().includes(tool.trim().toLowerCase()) &&
          row.brandName.toLowerCase().includes(brand.trim().toLowerCase()) &&
          quantityMatch &&
          amountMatch &&
          (!date || row.purchaseDate === date)
        );
      });
  }, [amount, brand, brands, date, items, orders, quantity, tool]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = Boolean(tool || brand || quantity || amount || date);

  useEffect(() => setPage(1), [amount, brand, date, quantity, tool]);

  const clearFilters = () => {
    setTool("");
    setBrand("");
    setQuantity("");
    setAmount("");
    setDate("");
  };

  const detailRow = rows.find((row) => row.id === detailId) ?? null;
  const editOrder = orders.find((o) => o.id === editId) ?? null;

  const askDelete = (row: { id: string; toolName: string }) => {
    if (window.confirm(`Delete this order for ${row.toolName}? The item's ordered count will be reduced.`)) {
      removeOrder(row.id);
      setDetailId((current) => (current === row.id ? null : current));
    }
  };

  return (
    <Shell eyebrow="Purchase history" title="Tools Order Log">
      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Ordered tools</h2>
            <span className="font-mono text-[12px] text-muted-fg">
              {rows.length} of {orders.length} records
            </span>
          </div>

          <div className="glass-surface mb-3 grid gap-2 rounded-xl border p-2 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_repeat(4,minmax(8rem,0.6fr))_auto]">
            <label className="relative block">
              <span className="sr-only">Filter by tool name</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
              <input aria-label="Filter by tool name" value={tool} onChange={(event) => setTool(event.target.value)} placeholder="Search tools" className={`${fieldClass} pl-9`} />
            </label>
            <input aria-label="Filter by brand" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Brand" className={fieldClass} />
            <input aria-label="Filter by quantity" type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" className={fieldClass} />
            <input aria-label="Filter by amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" className={fieldClass} />
            <input aria-label="Filter by purchase date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
            {hasFilters && (
              <button type="button" onClick={clearFilters} aria-label="Clear filters" title="Clear filters" className="grid size-10 place-items-center self-center rounded-lg text-muted-fg transition hover:bg-chip hover:text-ink">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="glass-surface overflow-x-auto rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden min-w-[68rem] grid-cols-[minmax(11rem,1.4fr)_minmax(7rem,0.8fr)_5rem_6rem_5.5rem_5.5rem_minmax(7rem,0.8fr)_7.5rem_5.5rem_5.5rem] items-center gap-3 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg xl:grid">
              <span>Tool name</span>
              <span>Brand</span>
              <span className="text-right">Ordered</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Previous</span>
              <span className="text-right">Total</span>
              <span>Document</span>
              <span>Purchase date</span>
              <span className="text-center">Confirmed</span>
              <span className="text-center">Actions</span>
            </div>

            {visibleRows.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">{hasFilters ? "No matching records" : "No orders yet"}</p>
                <p className="mt-1 text-[12px] text-muted-fg">{hasFilters ? "Try clearing or changing the filters." : "Orders saved from Inventory Items will appear here."}</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visibleRows.map((row) => (
                  <article key={row.id} role="button" tabIndex={0} onClick={() => setDetailId(row.id)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setDetailId(row.id); } }} className="cursor-pointer px-4 py-3.5 transition-colors hover:bg-panel/40 xl:grid xl:min-w-[68rem] xl:grid-cols-[minmax(11rem,1.4fr)_minmax(7rem,0.8fr)_5rem_6rem_5.5rem_5.5rem_minmax(7rem,0.8fr)_7.5rem_5.5rem_5.5rem] xl:items-center xl:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.toolName}</p>
                      <p className="mt-0.5 truncate text-[12px] text-muted-fg xl:hidden">{row.brandName}</p>
                    </div>
                    <span className="hidden truncate text-[12px] text-muted-fg xl:block">{row.brandName}</span>
                    <span className="hidden text-right font-mono text-[13px] font-semibold xl:block">{row.qtyOrdered}</span>
                    <span className="hidden text-right font-mono text-[12px] xl:block">{currency.format(row.amount)}</span>
                    <span className="hidden text-right font-mono text-[13px] text-muted-fg xl:block">{row.previousQty}</span>
                    <span className="hidden text-right font-mono text-[13px] font-semibold xl:block">{row.totalQty}</span>
                    <div className="hidden min-w-0 items-center gap-1.5 xl:flex">
                      {row.documentName ? <FileText size={14} className="shrink-0 text-accent-brand" /> : null}
                      <span className="truncate text-[11px] text-muted-fg">{row.documentName || "—"}</span>
                    </div>
                    <span className="hidden font-mono text-[11px] xl:block">{formatDate(row.purchaseDate)}</span>
                    <div className="hidden justify-center xl:flex">
                      <button type="button" role="switch" aria-checked={Boolean(row.confirmed)} aria-label={`${row.confirmed ? "Unconfirm" : "Confirm"} order for ${row.toolName}`} onClick={(event) => { event.stopPropagation(); updateOrder(row.id, { confirmed: !row.confirmed }); }} className={`relative h-5 w-9 rounded-full transition ${row.confirmed ? "bg-good" : "bg-line"}`}>
                        <span className={`absolute top-0.5 size-4 rounded-full bg-panel shadow transition-all ${row.confirmed ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    <div className="hidden items-center justify-center gap-1.5 xl:flex">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditId(row.id); }} aria-label={`Edit order for ${row.toolName}`} title="Edit" className="grid size-8 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); askDelete(row); }} aria-label={`Delete order for ${row.toolName}`} title="Delete" className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-4 gap-2 xl:hidden">
                      <div><p className="text-[10px] uppercase text-muted-fg">Ordered</p><p className="font-mono text-[11px] font-semibold">{row.qtyOrdered}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-fg">Previous</p><p className="font-mono text-[11px]">{row.previousQty}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-fg">Total</p><p className="font-mono text-[11px] font-semibold">{row.totalQty}</p></div>
                      <div><p className="text-[10px] uppercase text-muted-fg">Amount</p><p className="truncate font-mono text-[11px]">{currency.format(row.amount)}</p></div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 xl:hidden">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px]">{formatDate(row.purchaseDate)}</p>
                        {row.documentName && <p className="truncate text-[11px] text-muted-fg">{row.documentName}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <button type="button" role="switch" aria-checked={Boolean(row.confirmed)} aria-label={`${row.confirmed ? "Unconfirm" : "Confirm"} order for ${row.toolName}`} onClick={(event) => { event.stopPropagation(); updateOrder(row.id, { confirmed: !row.confirmed }); }} className={`relative h-5 w-9 rounded-full transition ${row.confirmed ? "bg-good" : "bg-line"}`}>
                          <span className={`absolute top-0.5 size-4 rounded-full bg-panel shadow transition-all ${row.confirmed ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setEditId(row.id); }} aria-label={`Edit order for ${row.toolName}`} title="Edit" className="grid size-8 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); askDelete(row); }} aria-label={`Delete order for ${row.toolName}`} title="Delete" className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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

      <DetailSheet
        open={!!detailRow}
        title="Order details"
        subtitle={detailRow?.toolName}
        onClose={() => setDetailId(null)}
        rows={
          detailRow
            ? [
                ["Tool name", detailRow.toolName],
                ["Brand", detailRow.brandName],
                ["Purchase date", formatDate(detailRow.purchaseDate)],
                ["Qty ordered", String(detailRow.qtyOrdered)],
                ["Amount", currency.format(detailRow.amount)],
                ["Previous qty", String(detailRow.previousQty)],
                ["Total qty", String(detailRow.totalQty)],
                ["Document", detailRow.documentName],
                ["Confirmed", detailRow.confirmed ? "Yes" : "No"],
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
      <EditOrderSheet order={editOrder} onClose={() => setEditId(null)} />
    </Shell>
  );
}
