import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, ClipboardList, DollarSign, PackageCheck, TrendingDown, Users } from "lucide-react";
import { useMemo } from "react";

import { Shell } from "@/components/Shell";
import { balanceOf, isLow, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventory Dashboard — TechPro" },
      {
        name: "description",
        content:
          "Monitor TechPro inventory health, stock movement, purchasing and tool assignments.",
      },
      { property: "og:title", content: "Inventory Dashboard — TechPro" },
      {
        property: "og:description",
        content: "A live operational view of stock health, purchasing and tool assignments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

function DashboardPage() {
  const { items, orders, assignments, toolTypes, users } = useStore();
  const totalBalance = items.reduce((sum, item) => sum + Math.max(0, balanceOf(item)), 0);
  const totalOrdered = items.reduce((sum, item) => sum + item.ordered, 0);
  const totalIssued = items.reduce((sum, item) => sum + item.issued, 0);
  const lowItems = items.filter(isLow).sort((a, b) => balanceOf(a) - balanceOf(b));
  const procurementSpend = orders.reduce((sum, order) => sum + order.amount, 0);
  const utilization = totalOrdered > 0 ? Math.round((totalIssued / totalOrdered) * 100) : 0;

  const itemById = new Map(items.map((item) => [item.id, item]));
  const userById = new Map(users.map((user) => [user.id, user.name]));
  const activity = useMemo(() => [
    ...orders.map((order) => ({ id: `order-${order.id}`, date: order.purchaseDate, kind: "Order" as const, title: `${order.qtyOrdered} × ${itemById.get(order.itemId)?.name ?? "Removed item"}`, detail: currency.format(order.amount) })),
    ...assignments.map((assignment) => ({ id: `assignment-${assignment.id}`, date: assignment.issuedDate, kind: "Assigned" as const, title: `${assignment.qtyIssued} × ${itemById.get(assignment.itemId)?.name ?? "Removed item"}`, detail: userById.get(assignment.userId) ?? "Removed user" })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [assignments, orders, items, users]);

  const movement = [...items].sort((a, b) => b.ordered - a.ordered).slice(0, 6);
  const maxMovement = Math.max(1, ...movement.map((item) => Math.max(item.ordered, item.issued)));
  const typeHealth = toolTypes.map((type) => {
    const related = items.filter((item) => item.typeId === type.id);
    return { ...type, count: related.length, balance: related.reduce((sum, item) => sum + Math.max(0, balanceOf(item)), 0) };
  }).filter((type) => type.count > 0).sort((a, b) => b.balance - a.balance);

  return (
    <Shell eyebrow="Operations overview" title="Command Center">
      <div className="animate-rise space-y-5 px-5 py-6 lg:px-8 lg:py-8">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric icon={Boxes} label="Inventory items" value={String(items.length)} note={`${totalBalance} units on hand`} />
          <Link to="/inventory-items" search={{ balance: "below" }} className="block">
            <Metric icon={AlertTriangle} label="Low stock alerts" value={String(lowItems.length)} note={`${lowItems.filter((item) => item.essential).length} essential`} alert />
          </Link>
          <Metric icon={PackageCheck} label="Units issued" value={String(totalIssued)} note={`${utilization}% of ordered stock`} />
          <Metric icon={DollarSign} label="Procurement spend" value={currency.format(procurementSpend)} note={`${orders.length} purchase records`} />
        </section>

        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(18rem,0.8fr)]">
          <div className="glass-surface min-h-[23rem] min-w-0 rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-display text-lg font-bold">Stock movement</p><p className="mt-1 text-xs text-muted-fg">Ordered versus issued by highest-volume item</p></div>
              <div className="flex gap-4 text-[10px] font-semibold uppercase text-muted-fg"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent-brand" />Ordered</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-good" />Issued</span></div>
            </div>
            {movement.length === 0 ? <Empty message="Add inventory items to see stock movement." /> : (
              <div className="mt-8 space-y-5">
                {movement.map((item) => (
                  <div key={item.id} className="grid min-w-0 grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                    <p className="min-w-0 truncate text-xs font-medium" title={item.name}>{item.name}</p>
                    <div className="min-w-0 space-y-1.5">
                      <div className="h-2 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-accent-brand transition-all" style={{ width: `${(item.ordered / maxMovement) * 100}%` }} /></div>
                      <div className="h-2 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-good transition-all" style={{ width: `${(item.issued / maxMovement) * 100}%` }} /></div>
                    </div>
                    <p className="min-w-0 text-right font-mono text-[11px] text-muted-fg">{item.ordered}/{item.issued}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-surface min-w-0 rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-bold">Needs attention</p><p className="mt-1 text-xs text-muted-fg">At or below threshold</p></div><TrendingDown className="text-accent-brand" size={20} /></div>
            {lowItems.length === 0 ? <div className="mt-10 flex flex-col items-center text-center"><CheckCircle2 size={30} className="text-good" /><p className="mt-3 text-sm font-semibold">Stock levels look healthy</p></div> : (
              <div className="mt-5 divide-y divide-line">
                {lowItems.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-[11px] text-muted-fg">Threshold {item.threshold}{item.essential ? " · Essential" : ""}</p></div><span className="rounded-lg bg-warn-soft px-2.5 py-1 font-mono text-xs font-bold text-warn">{balanceOf(item)} left</span></div>)}
              </div>
            )}
            <Link to="/inventory-items" search={{ balance: "below" }} className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs font-semibold text-muted-fg transition hover:text-ink"><span>Review inventory</span><ArrowRight size={14} /></Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1.25fr]">
          <div className="glass-surface rounded-2xl border p-5 lg:p-6">
            <div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">Inventory mix</p><p className="mt-1 text-xs text-muted-fg">Available units by category</p></div><ClipboardList size={19} className="text-muted-fg" /></div>
            <div className="mt-5 space-y-4">
              {typeHealth.length === 0 ? <Empty message="Category totals will appear here." /> : typeHealth.slice(0, 5).map((type) => <div key={type.id}><div className="mb-1.5 flex items-center justify-between text-xs"><span>{type.name}</span><span className="font-mono text-muted-fg">{type.balance} units</span></div><div className="h-1.5 rounded-full bg-chip"><div className="h-full rounded-full brand-gradient" style={{ width: `${Math.max(3, totalBalance ? (type.balance / totalBalance) * 100 : 0)}%` }} /></div></div>)}
            </div>
          </div>

          <div className="glass-surface rounded-2xl border p-5 lg:p-6">
            <div className="flex items-center justify-between"><div><p className="font-display text-lg font-bold">Operations log</p><p className="mt-1 text-xs text-muted-fg">Latest purchases and assignments</p></div><Users size={19} className="text-muted-fg" /></div>
            {activity.length === 0 ? <Empty message="Orders and assignments will appear here." /> : <div className="mt-4 divide-y divide-line">{activity.map((entry) => <div key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"><span className={`size-2 rounded-full ${entry.kind === "Order" ? "bg-accent-brand" : "bg-good"}`} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.title}</p><p className="text-[11px] text-muted-fg">{entry.kind} · {entry.detail}</p></div><time className="font-mono text-[10px] text-muted-fg">{formatDate(entry.date)}</time></div>)}</div>}
            <div className="mt-4 flex gap-4 border-t border-line pt-4 text-xs font-semibold"><Link to="/tools-order-log" className="text-muted-fg transition hover:text-ink">Order log</Link><Link to="/tool-assigned-log" className="text-muted-fg transition hover:text-ink">Assignment log</Link></div>
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Metric({ icon: Icon, label, value, note, alert = false }: { icon: typeof Boxes; label: string; value: string; note: string; alert?: boolean }) {
  return <article className={`glass-surface relative overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-accent-brand/30 lg:p-5 ${alert ? "border-accent-brand/30" : ""}`}><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">{label}</p><Icon size={16} className={alert ? "text-accent-brand" : "text-muted-fg"} /></div><p className={`mt-3 font-display text-2xl font-bold lg:text-3xl ${alert ? "text-accent-brand" : ""}`}>{value}</p><p className="mt-1 text-[11px] text-muted-fg">{note}</p></article>;
}

function Empty({ message }: { message: string }) {
  return <p className="py-10 text-center text-xs text-muted-fg">{message}</p>;
}

function formatDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
