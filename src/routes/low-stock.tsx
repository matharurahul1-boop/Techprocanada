import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";
import { balanceOf, useStore } from "@/lib/store";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/low-stock")({
  head: () => ({
    meta: [
      { title: "Low Stock — TechPro Inventory Console" },
      {
        name: "description",
        content: "Every tool or consumable whose balance has dropped to or below its threshold.",
      },
      { property: "og:title", content: "Low Stock — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "See at a glance which tools are low on stock and by how much.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LowStockPage,
});

function LowStockPage() {
  const { items, toolTypes } = useStore();
  const [search, setSearch] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("all");
  const [page, setPage] = useState(1);

  const typeName = (id: string) => toolTypes.find((t) => t.id === id)?.name ?? "Unassigned";

  const lowItems = items
    .filter((item) => balanceOf(item) < item.threshold)
    .filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((item) => filterTypeId === "all" || item.typeId === filterTypeId)
    .sort((a, b) => balanceOf(a) - balanceOf(b));

  const essentialCount = lowItems.filter((item) => item.essential).length;
  const filtersActive = search.trim() !== "" || filterTypeId !== "all";

  const pageCount = Math.max(1, Math.ceil(lowItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = lowItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterTypeId]);

  return (
    <Shell eyebrow="Stock health" title="Low Stock">
      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Below threshold</h2>
            <span className="font-mono text-[12px] text-muted-fg">
              {lowItems.length} items · {essentialCount} essential
            </span>
          </div>

          <div className="glass-surface mb-3 grid gap-2 rounded-xl border p-2 sm:grid-cols-2">
            <label className="relative block">
              <span className="sr-only">Search low-stock items</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
              <input
                aria-label="Search low-stock items"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search items"
                className={`${fieldClass} pl-9`}
              />
            </label>
            <div className="relative">
              <select
                aria-label="Filter by tool type"
                value={filterTypeId}
                onChange={(event) => setFilterTypeId(event.target.value)}
                className={`${fieldClass} appearance-none pr-9`}
              >
                <option value="all">All tool types</option>
                {toolTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
                ▾
              </span>
            </div>
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,0.8fr)_5rem_5rem_6rem_6rem] items-center gap-4 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
              <span>Item</span>
              <span>Tool type</span>
              <span className="text-right">Ordered</span>
              <span className="text-right">Issued</span>
              <span className="text-right">Threshold</span>
              <span className="text-right">Balance</span>
            </div>

            {lowItems.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <TriangleAlert className="mx-auto text-good" size={26} />
                <p className="mt-3 text-sm font-semibold">
                  {filtersActive ? "No matching low-stock items" : "Stock levels look healthy"}
                </p>
                <p className="mt-1 text-[12px] text-muted-fg">
                  {filtersActive
                    ? "Try clearing or changing the filters."
                    : "Nothing is at or below its threshold right now."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visibleItems.map((item) => {
                  const balance = balanceOf(item);
                  const critical = balance < 0;
                  return (
                    <div
                      key={item.id}
                      className="px-4 py-3.5 lg:grid lg:grid-cols-[minmax(12rem,1.4fr)_minmax(8rem,0.8fr)_5rem_5rem_6rem_6rem] lg:items-center lg:gap-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                          {item.essential && (
                            <span className="ml-2 rounded-full bg-chip px-2 py-0.5 align-middle font-mono text-[10px] text-muted-fg">
                              essential
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[12px] text-muted-fg lg:hidden">{typeName(item.typeId)}</p>
                      </div>
                      <span className="hidden truncate text-[12px] text-muted-fg lg:block">
                        {typeName(item.typeId)}
                      </span>
                      <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                        {item.ordered}
                      </span>
                      <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                        {item.issued}
                      </span>
                      <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                        {item.threshold}
                      </span>
                      <span
                        className={`hidden text-right font-mono text-sm font-bold lg:block ${
                          critical ? "text-destructive" : "text-warn"
                        }`}
                      >
                        {balance}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 lg:hidden">
                        <span className="font-mono text-[11px] text-muted-fg">Ord {item.ordered}</span>
                        <span className="font-mono text-[11px] text-muted-fg">Iss {item.issued}</span>
                        <span className="font-mono text-[11px] text-muted-fg">Thr {item.threshold}</span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            critical ? "text-destructive" : "text-warn"
                          }`}
                        >
                          Bal {balance}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={lowItems.length}
            pageSize={PAGE_SIZE}
            itemLabel="items"
          />

          <Link
            to="/inventory-items"
            search={{ balance: "below" }}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-brand hover:underline"
          >
            Order or edit these items in Inventory Items →
          </Link>
        </section>
      </div>
    </Shell>
  );
}
