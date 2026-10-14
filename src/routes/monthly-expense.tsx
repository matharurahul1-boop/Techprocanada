import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, DollarSign, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Shell } from "@/components/Shell";
import { DataList } from "@/components/DataList";
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

  const chronological = [...months];
  const tableRows = [...months].reverse();

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

          <DataList
            rows={tableRows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "months" }}
            rowKey={(m) => `${m.year}-${m.month}`}
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">No purchase orders logged yet.</p>
            }
            columns={[
              {
                header: "Month",
                sortValue: (m) => m.year * 100 + m.month,
                width: "minmax(10rem,1fr)",
                cell: (m) => (
                  <p className="text-sm font-semibold">
                    {MONTH_NAMES[m.month - 1]} {m.year}
                  </p>
                ),
              },
              {
                header: "Orders",
                sortValue: (m) => m.count,
                width: "8rem",
                align: "right",
                cell: (m) => <p className="font-mono text-[13px] text-muted-fg">{m.count}</p>,
              },
              {
                header: "Total spend",
                sortValue: (m) => m.total,
                width: "8rem",
                align: "right",
                cell: (m) => <p className="font-mono text-sm font-semibold">{currency.format(m.total)}</p>,
              },
            ]}
            card={(m) => (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  {MONTH_NAMES[m.month - 1]} {m.year}
                </p>
                <p className="text-right font-mono text-sm font-semibold">{currency.format(m.total)}</p>
              </div>
            )}
          />
        </section>
      </div>
    </Shell>
  );
}
