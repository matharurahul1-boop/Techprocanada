import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleDollarSign, Clock } from "lucide-react";
import { useMemo, useState } from "react";

import { Shell } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";
import { updateOrder, useStore } from "@/lib/store";

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
  const { orders, items, brands } = useStore();
  const [filter, setFilter] = useState<"all" | "confirmed" | "unconfirmed">("unconfirmed");
  const [page, setPage] = useState(1);

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

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (value: string) => {
    if (!value) return "—";
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

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
            <h2 className="font-display text-base font-semibold">Orders</h2>
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

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden grid-cols-[minmax(10rem,1.3fr)_minmax(7rem,0.8fr)_6rem_7rem_6rem] items-center gap-4 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
              <span>Item</span>
              <span>Brand</span>
              <span className="text-right">Amount</span>
              <span>Purchase date</span>
              <span className="text-center">Confirmed</span>
            </div>
            {visibleRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-fg">No matching orders.</p>
            ) : (
              <div className="divide-y divide-line">
                {visibleRows.map((row) => (
                  <div
                    key={row.id}
                    className="px-4 py-3.5 lg:grid lg:grid-cols-[minmax(10rem,1.3fr)_minmax(7rem,0.8fr)_6rem_7rem_6rem] lg:items-center lg:gap-4"
                  >
                    <p className="truncate text-sm font-semibold">
                      {itemById.get(row.itemId) ?? "Removed item"}
                    </p>
                    <span className="hidden truncate text-[12px] text-muted-fg lg:block">
                      {brandById.get(row.brandId) ?? "Removed brand"}
                    </span>
                    <span className="hidden text-right font-mono text-[13px] font-semibold lg:block">
                      {currency.format(row.amount)}
                    </span>
                    <span className="hidden font-mono text-[12px] text-muted-fg lg:block">
                      {formatDate(row.purchaseDate)}
                    </span>
                    <div className="hidden justify-center lg:flex">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(row.confirmed)}
                        aria-label={`${row.confirmed ? "Unconfirm" : "Confirm"} order`}
                        onClick={() => updateOrder(row.id, { confirmed: !row.confirmed })}
                        className={`relative h-5 w-9 rounded-full transition ${row.confirmed ? "bg-good" : "bg-line"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-4 rounded-full bg-panel shadow transition-all ${row.confirmed ? "left-[18px]" : "left-0.5"}`}
                        />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 lg:hidden">
                      <p className="font-mono text-[11px] text-muted-fg">
                        {brandById.get(row.brandId) ?? "Removed brand"} · {currency.format(row.amount)} ·{" "}
                        {formatDate(row.purchaseDate)}
                      </p>
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
                    </div>
                  </div>
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
            itemLabel="orders"
          />
        </section>
      </div>
    </Shell>
  );
}
