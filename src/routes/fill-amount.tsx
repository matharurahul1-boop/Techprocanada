import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleDollarSign, Clock, Pencil, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Shell } from "@/components/Shell";
import { DataList } from "@/components/DataList";
import { useConfirmDelete } from "@/components/confirm-delete";
import { EditOrderSheet } from "@/components/edit-sheets";
import { removeOrder, updateOrder, useStore, type ToolOrder } from "@/lib/store";
import { missingPriceRows, printMissingPricesForm } from "@/lib/missing-prices-form";

const PAGE_SIZE = 20;
const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export const Route = createFileRoute("/fill-amount")({
  head: () => ({
    meta: [
      { title: "Fill Amount — TechPro Inventory Console" },
      {
        name: "description",
        content: "Confirmed versus unconfirmed order amounts — see what's still pending confirmation.",
      },
      { property: "og:title", content: "Fill Amount — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track confirmed vs pending TechPro order amounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FillAmountPage,
});

function FillAmountPage() {
  const { orders, items, brands, toolTypes } = useStore();
  const [filter, setFilter] = useState<"all" | "confirmed" | "unconfirmed">("unconfirmed");
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);

  const itemById = new Map(items.map((item) => [item.id, item.name]));
  const brandById = new Map(brands.map((brand) => [brand.id, brand.name]));

  const { confirmedTotal, unconfirmedTotal, confirmedCount, unconfirmedCount } = useMemo(() => {
    let confirmedTotal = 0;
    let unconfirmedTotal = 0;
    let confirmedCount = 0;
    let unconfirmedCount = 0;
    for (const order of orders) {
      if (order.confirmed) {
        confirmedTotal += order.amount;
        confirmedCount += 1;
      } else {
        unconfirmedTotal += order.amount;
        unconfirmedCount += 1;
      }
    }
    return { confirmedTotal, unconfirmedTotal, confirmedCount, unconfirmedCount };
  }, [orders]);

  const totalAmount = confirmedTotal + unconfirmedTotal;
  const confirmedPct = totalAmount > 0 ? Math.round((confirmedTotal / totalAmount) * 100) : 0;

  const rows = orders
    .filter((order) =>
      filter === "all" ? true : filter === "confirmed" ? Boolean(order.confirmed) : !order.confirmed,
    )
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));


  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const askDelete = (id: string, name: string) =>
    confirmDelete({
      title: `Delete this order for ${name}?`,
      description: "The item's ordered count will be reduced.",
      onConfirm: () => removeOrder(id),
    });

  const rowActions = (row: { id: string; itemId: string }) => (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => setEditId(row.id)}
        aria-label="Edit order"
        title="Edit"
        className="grid size-8 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={() => askDelete(row.id, itemById.get(row.itemId) ?? "this order")}
        aria-label="Delete order"
        title="Delete"
        className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const confirmSwitch = (row: ToolOrder) => (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(row.confirmed)}
      aria-label={`${row.confirmed ? "Unconfirm" : "Confirm"} order`}
      onClick={() => updateOrder(row.id, { confirmed: !row.confirmed })}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${row.confirmed ? "bg-good" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-panel shadow transition-all ${row.confirmed ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );

  const formatDate = (value: string) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  // Missing prices follow what the table shows: its own filters, search and dropdowns.
  const [shownIds, setShownIds] = useState<Set<string> | null>(null);
  const missingPrices = missingPriceRows(
    shownIds ? orders.filter((order) => shownIds.has(order.id)) : orders,
    items,
    brands,
    toolTypes,
  );

  return (
    <Shell eyebrow="Procurement" title="Fill Amount">
      <div className="animate-rise space-y-5 px-5 py-6 lg:px-8 lg:py-8">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-surface rounded-2xl border p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Total amount</p>
              <CircleDollarSign size={16} className="text-muted-fg" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold lg:text-3xl">{currency.format(totalAmount)}</p>
            <p className="mt-1 text-[11px] text-muted-fg">{orders.length} purchase orders</p>
          </div>
          <div className="glass-surface rounded-2xl border p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Confirmed</p>
              <CheckCircle2 size={16} className="text-good" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-good lg:text-3xl">
              {currency.format(confirmedTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted-fg">{confirmedCount} orders · {confirmedPct}%</p>
          </div>
          <div className="glass-surface rounded-2xl border border-accent-brand/30 p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Pending</p>
              <Clock size={16} className="text-accent-brand" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-accent-brand lg:text-3xl">
              {currency.format(unconfirmedTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted-fg">{unconfirmedCount} orders still unconfirmed</p>
          </div>
        </section>

        <section className="glass-surface rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-bold">Confirmed vs pending</p>
            <span className="font-mono text-[12px] font-semibold text-muted-fg">{confirmedPct}% confirmed</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-chip">
            <div className="h-full rounded-full bg-good transition-all" style={{ width: `${confirmedPct}%` }} />
          </div>
          <div className="mt-3 flex gap-4 text-[11px] font-semibold text-muted-fg">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-good" />Confirmed</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chip ring-1 ring-line" />Pending</span>
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-base font-semibold">Orders</h2>
              <button
              type="button"
              onClick={() => printMissingPricesForm(missingPrices)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-chip px-3 text-[12px] font-semibold text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
              title="Print a form listing every tool whose orders have no price"
            >
              <Printer size={14} /> Missing prices form ({missingPrices.length})
            </button>
            </div>
            <div className="flex gap-1.5">
              {(["unconfirmed", "confirmed", "all"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilter(key);
                    setPage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${
                    filter === key
                      ? "bg-accent-brand text-accent-brand-ink ring-accent-brand"
                      : "bg-panel text-muted-fg ring-line hover:text-ink"
                  }`}
                >
                  {key === "unconfirmed" ? "Pending" : key === "confirmed" ? "Confirmed" : "All"}
                </button>
              ))}
            </div>
          </div>

          <DataList
            onResultsChange={(shown) => setShownIds(new Set(shown.map((row) => row.id)))}
            searchable
            rows={rows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "orders" }}
            rowKey={(row) => row.id}
            empty={<p className="px-4 py-8 text-center text-sm text-muted-fg">No matching orders.</p>}
            columns={[
              {
                header: "Item",
                sortValue: (row) => itemById.get(row.itemId) ?? "",
                width: "minmax(10rem,1.3fr)",
                cell: (row) => (
                  <p className="truncate text-sm font-semibold">{itemById.get(row.itemId) ?? "Removed item"}</p>
                ),
              },
              {
                header: "Brand",
                filter: "select",
                sortValue: (row) => brandById.get(row.brandId) ?? "",
                width: "minmax(7rem,0.8fr)",
                cell: (row) => (
                  <span className="block truncate text-[12px] text-muted-fg">
                    {brandById.get(row.brandId) ?? "Removed brand"}
                  </span>
                ),
              },
              {
                header: "Amount",
                sortValue: (row) => row.amount,
                width: "6rem",
                align: "right",
                cell: (row) => (
                  <span className="font-mono text-[13px] font-semibold">{currency.format(row.amount)}</span>
                ),
              },
              {
                header: "Purchase date",
                sortValue: (row) => row.purchaseDate,
                width: "7rem",
                cell: (row) => (
                  <span className="font-mono text-[12px] text-muted-fg">{formatDate(row.purchaseDate)}</span>
                ),
              },
              {
                header: "Confirmed",
                sortValue: (row) => (row.confirmed ? 1 : 0),
                width: "6rem",
                align: "center",
                cell: (row) => <div className="flex justify-center">{confirmSwitch(row)}</div>,
              },
              { header: "Actions", width: "5.5rem", align: "center", cell: rowActions },
            ]}
            card={(row) => (
              <>
                <p className="truncate text-sm font-semibold">{itemById.get(row.itemId) ?? "Removed item"}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] text-muted-fg">
                    {brandById.get(row.brandId) ?? "Removed brand"} · {currency.format(row.amount)} ·{" "}
                    {formatDate(row.purchaseDate)}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {rowActions(row)}
                    {confirmSwitch(row)}
                  </div>
                </div>
              </>
            )}
          />
        </section>
      </div>
      <EditOrderSheet order={orders.find((o) => o.id === editId) ?? null} onClose={() => setEditId(null)} />
      {confirmDialog}
    </Shell>
  );
}
