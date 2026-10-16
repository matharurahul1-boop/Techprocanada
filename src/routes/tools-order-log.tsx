import { createFileRoute } from "@tanstack/react-router";
import { FileText, Pencil, Printer, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { DataList } from "@/components/DataList";
import { useConfirmDelete } from "@/components/confirm-delete";
import { DetailSheet, EditOrderSheet, formatDate } from "@/components/edit-sheets";
import { missingPriceRows, printMissingPricesForm } from "@/lib/missing-prices-form";
import {
  getOrderDocumentUrl,
  isStoredDocument,
  removeOrder,
  removeOrderDocuments,
  updateOrder,
  useStore,
} from "@/lib/store";
import { DocumentChip, openDocument } from "@/components/document-chip";

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
  const { orders, items, brands, toolTypes } = useStore();
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

  const { confirmDelete, confirmDialog } = useConfirmDelete();
  // The order document: click to open it, × to delete the file and clear it from the order.
  const documentChip = (row: { id: string; documentName: string }) => (
    <DocumentChip
      path={row.documentName}
      onOpen={
        isStoredDocument(row.documentName)
          ? () => void openDocument(() => getOrderDocumentUrl(row.documentName))
          : undefined
      }
      onDelete={() =>
        confirmDelete({
          title: "Delete this document?",
          description: "The file is removed from the order. The order itself is kept.",
          onConfirm: () => {
            if (isStoredDocument(row.documentName)) removeOrderDocuments([row.documentName]);
            updateOrder(row.id, { documentName: "" });
          },
        })
      }
    />
  );

  const askDelete = (row: { id: string; toolName: string }) =>
    confirmDelete({
      title: `Delete this order for ${row.toolName}?`,
      description: "The item's ordered count will be reduced.",
      onConfirm: () => {
        removeOrder(row.id);
        setDetailId((current) => (current === row.id ? null : current));
      },
    });

  type LogRow = (typeof rows)[number];

  const confirmSwitch = (row: LogRow) => (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(row.confirmed)}
      aria-label={`${row.confirmed ? "Unconfirm" : "Confirm"} order for ${row.toolName}`}
      onClick={(event) => {
        event.stopPropagation();
        updateOrder(row.id, { confirmed: !row.confirmed });
      }}
      className={`relative h-5 w-9 rounded-full transition ${row.confirmed ? "bg-good" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-panel shadow transition-all ${row.confirmed ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );

  const rowActions = (row: LogRow) => (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setEditId(row.id);
        }}
        aria-label={`Edit order for ${row.toolName}`}
        title="Edit"
        className="grid size-8 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          askDelete(row);
        }}
        aria-label={`Delete order for ${row.toolName}`}
        title="Delete"
        className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  // Missing prices follow what the table shows: its own filters, search and dropdowns.
  const [shownIds, setShownIds] = useState<Set<string> | null>(null);
  const missingPrices = missingPriceRows(
    shownIds ? orders.filter((order) => shownIds.has(order.id)) : orders,
    items,
    brands,
    toolTypes,
  );

  return (
    <Shell eyebrow="Purchase history" title="Tools Order Log">
      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Ordered tools</h2>
            <div className="flex items-center gap-3">
              <button
              type="button"
              onClick={() => printMissingPricesForm(missingPrices)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-chip px-3 text-[12px] font-semibold text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
              title="Print a form listing every tool whose orders have no price"
            >
              <Printer size={14} /> Missing prices form ({missingPrices.length})
            </button>
              <span className="font-mono text-[12px] text-muted-fg">
                {rows.length} of {orders.length} records
              </span>
            </div>
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

          <DataList
            onResultsChange={(shown) => setShownIds(new Set(shown.map((row) => row.id)))}
            rows={rows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "records" }}
            rowKey={(row) => row.id}
            breakpoint="xl"
            minWidth="68rem"
            onRowClick={(row) => setDetailId(row.id)}
            empty={
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">{hasFilters ? "No matching records" : "No orders yet"}</p>
                <p className="mt-1 text-[12px] text-muted-fg">
                  {hasFilters ? "Try clearing or changing the filters." : "Orders saved from Inventory Items will appear here."}
                </p>
              </div>
            }
            columns={[
              {
                header: "Tool name",
                sortValue: (row) => row.toolName,
                width: "minmax(11rem,1.4fr)",
                cell: (row) => <p className="truncate text-sm font-semibold">{row.toolName}</p>,
              },
              {
                header: "Brand",
                filter: "select",
                sortValue: (row) => row.brandName,
                width: "minmax(7rem,0.8fr)",
                cell: (row) => <span className="block truncate text-[12px] text-muted-fg">{row.brandName}</span>,
              },
              {
                header: "Ordered",
                sortValue: (row) => row.qtyOrdered,
                width: "5rem",
                align: "right",
                cell: (row) => <span className="font-mono text-[13px] font-semibold">{row.qtyOrdered}</span>,
              },
              {
                header: "Unit price",
                sortValue: (row) => (row.qtyOrdered > 0 ? row.amount / row.qtyOrdered : row.amount),
                width: "6rem",
                align: "right",
                cell: (row) => (
                  <span className="font-mono text-[12px] text-muted-fg">
                    {currency.format(row.qtyOrdered > 0 ? row.amount / row.qtyOrdered : row.amount)}
                  </span>
                ),
              },
              {
                header: "Total",
                sortValue: (row) => row.amount,
                width: "6rem",
                align: "right",
                cell: (row) => <span className="font-mono text-[12px]">{currency.format(row.amount)}</span>,
              },
              {
                header: "Previous",
                sortValue: (row) => row.previousQty,
                width: "5.5rem",
                align: "right",
                cell: (row) => <span className="font-mono text-[13px] text-muted-fg">{row.previousQty}</span>,
              },
              {
                header: "Total",
                sortValue: (row) => row.totalQty,
                width: "5.5rem",
                align: "right",
                cell: (row) => <span className="font-mono text-[13px] font-semibold">{row.totalQty}</span>,
              },
              {
                header: "Document",
                sortValue: (row) => row.documentName,
                width: "minmax(7rem,0.8fr)",
                cell: (row) => (
                  <div className="flex min-w-0 items-center gap-1.5">
                    {row.documentName ? documentChip(row) : <span className="text-[11px] text-muted-fg">—</span>}
                  </div>
                ),
              },
              {
                header: "Purchase date",
                sortValue: (row) => row.purchaseDate,
                width: "7.5rem",
                cell: (row) => <span className="font-mono text-[11px]">{formatDate(row.purchaseDate)}</span>,
              },
              {
                header: "Confirmed",
                filter: "toggle", filterValue: (r) => Boolean(r.confirmed),
                sortValue: (row) => (row.confirmed ? 1 : 0),
                width: "5.5rem",
                align: "center",
                cell: (row) => <div className="flex justify-center">{confirmSwitch(row)}</div>,
              },
              { header: "Actions", width: "5.5rem", align: "center", cell: rowActions },
            ]}
            card={(row) => (
              <>
                <p className="truncate text-sm font-semibold">{row.toolName}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted-fg">{row.brandName}</p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <div><p className="text-[10px] uppercase text-muted-fg">Ordered</p><p className="font-mono text-[11px] font-semibold">{row.qtyOrdered}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-fg">Previous</p><p className="font-mono text-[11px]">{row.previousQty}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-fg">Total</p><p className="font-mono text-[11px] font-semibold">{row.totalQty}</p></div>
                  <div><p className="text-[10px] uppercase text-muted-fg">Amount</p><p className="truncate font-mono text-[11px]">{currency.format(row.amount)}</p></div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px]">{formatDate(row.purchaseDate)}</p>
                    {row.documentName && <div className="mt-1">{documentChip(row)}</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {confirmSwitch(row)}
                    {rowActions(row)}
                  </div>
                </div>
              </>
            )}
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
                ["Document", detailRow.documentName.split("/").pop() ?? ""],
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
      {confirmDialog}
    </Shell>
  );
}
