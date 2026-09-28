import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, DollarSign, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Shell } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";
import { useStore } from "@/lib/store";

const PAGE_SIZE = 20;
const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const Route = createFileRoute("/monthly-expense")({
  head: () => ({
    meta: [
      { title: "Monthly Expense — TechPro Inventory Console" },
      {
        name: "description",
        content: "Total TechPro inventory order spend broken down by month.",
      },
      { property: "og:title", content: "Monthly Expense — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "See TechPro procurement spend trends by month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonthlyExpensePage,
});

function MonthlyExpensePage() {
  const { orders } = useStore();
  const [page, setPage] = useState(1);

  const months = useMemo(() => {
    const byKey = new Map<string, { year: number; month: number; total: number; count: number }>();
    for (const order of orders) {
      if (!order.purchaseDate) continue;
      const [yearStr, monthStr] = order.purchaseDate.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      if (!year || !month) continue;
      const key = `${year}-${month}`;
      const existing = byKey.get(key) ?? { year, month, total: 0, count: 0 };
      existing.total += order.amount;
      existing.count += 1;
      byKey.set(key, existing);
    }
    return [...byKey.values()].sort((a, b) => a.year - b.year || a.month - b.month);
  }, [orders]);

  const totalSpend = months.reduce((sum, m) => sum + m.total, 0);
  const averageMonthly = months.length > 0 ? totalSpend / months.length : 0;
  const highestMonth = months.reduce<(typeof months)[number] | null>(
    (best, m) => (!best || m.total > best.total ? m : best),
    null,
  );
  const maxTotal = Math.max(1, ...months.map((m) => m.total));

  const pageCount = Math.max(1, Math.ceil(months.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const chronological = [...months];
  const tableRows = [...months].reverse().slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Shell eyebrow="Procurement" title="Monthly Expense">
      <div className="animate-rise space-y-5 px-5 py-6 lg:px-8 lg:py-8">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass-surface rounded-2xl border p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Total spend</p>
              <DollarSign size={16} className="text-accent-brand" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold lg:text-3xl">{currency.format(totalSpend)}</p>
            <p className="mt-1 text-[11px] text-muted-fg">{orders.length} purchase records</p>
          </div>
          <div className="glass-surface rounded-2xl border p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Average / month</p>
              <TrendingUp size={16} className="text-muted-fg" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold lg:text-3xl">{currency.format(averageMonthly)}</p>
            <p className="mt-1 text-[11px] text-muted-fg">Across {months.length} months</p>
          </div>
          <div className="glass-surface rounded-2xl border p-4 lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Highest month</p>
              <CalendarRange size={16} className="text-muted-fg" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold lg:text-3xl">
              {highestMonth ? currency.format(highestMonth.total) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-muted-fg">
              {highestMonth ? `${MONTH_NAMES[highestMonth.month - 1]} ${highestMonth.year}` : "No data yet"}
            </p>
          </div>
        </section>

        <section className="glass-surface rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
          <p className="font-display text-lg font-bold">Spend by month</p>
          <p className="mt-1 text-xs text-muted-fg">Total order amount per month, oldest to newest</p>
          {chronological.length === 0 ? (
            <p className="mt-10 py-6 text-center text-sm text-muted-fg">No purchase orders logged yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {chronological.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="grid grid-cols-[minmax(6rem,8rem)_minmax(0,1fr)_5.5rem] items-center gap-3"
                >
                  <p className="truncate text-xs font-medium text-muted-fg">
                    {MONTH_NAMES[m.month - 1]?.slice(0, 3)} {m.year}
                  </p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full rounded-full bg-accent-brand transition-all"
                      style={{ width: `${(m.total / maxTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-right font-mono text-[11px] font-semibold">{currency.format(m.total)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Month by month</h2>
            <span className="font-mono text-[12px] text-muted-fg">{months.length} months</span>
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden grid-cols-[minmax(10rem,1fr)_8rem_8rem] items-center gap-4 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
              <span>Month</span>
              <span className="text-right">Orders</span>
              <span className="text-right">Total spend</span>
            </div>
            {tableRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-fg">No purchase orders logged yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {tableRows.map((m) => (
                  <div
                    key={`${m.year}-${m.month}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 lg:grid lg:grid-cols-[minmax(10rem,1fr)_8rem_8rem]"
                  >
                    <p className="text-sm font-semibold">
                      {MONTH_NAMES[m.month - 1]} {m.year}
                    </p>
                    <p className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                      {m.count}
                    </p>
                    <p className="text-right font-mono text-sm font-semibold">{currency.format(m.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={months.length}
            pageSize={PAGE_SIZE}
            itemLabel="months"
          />
        </section>
      </div>
    </Shell>
  );
}
