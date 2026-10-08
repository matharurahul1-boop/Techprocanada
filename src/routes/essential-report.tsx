import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Shell } from "@/components/Shell";
import techProLogo from "@/assets/techpro-logo.png";
import { balanceOf, useStore } from "@/lib/store";

export const Route = createFileRoute("/essential-report")({
  head: () => ({
    meta: [
      { title: "Essential Tools Report — TechPro Inventory Console" },
      {
        name: "description",
        content: "Printable report of essential tools that are missing or low, with the quantity to order.",
      },
      { property: "og:title", content: "Essential Tools Report — TechPro Inventory Console" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EssentialReportPage,
});

type Status = "Missing" | "Low" | "OK";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

type PrintRow = {
  name: string;
  type: string;
  brand: string;
  threshold: number;
  balance: number;
  status: Status;
  toOrder: number;
};

const SHEET_CSS = `
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11pt;margin:28px;color:#111}
  .head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #c81717;padding-bottom:10px;margin-bottom:14px}
  .head img{height:56px} .head .t{text-align:right}
  h1{margin:0;font-size:20pt;letter-spacing:.5px} .sub{color:#555;font-size:10pt;margin-top:2px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:14px}
  .meta div{border-bottom:1px solid #000;padding:4px 0;font-size:10pt;min-height:24px}
  .meta b{display:inline-block;min-width:92px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #000;padding:6px 7px;text-align:center;font-size:9.5pt}
  th{background:#eee} td.l{text-align:left}
  td.box{width:26px} td.box span{display:inline-block;width:14px;height:14px;border:1.5px solid #000}
  td.missing{color:#b00020;font-weight:bold} td.low{color:#a15c00;font-weight:bold}
  td.notes{width:20%} tfoot td{font-weight:bold;background:#f6f6f6}
  .sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;margin-top:46px}
  .sign div{border-top:1px solid #000;padding-top:4px;font-size:9.5pt;text-align:center}
  .foot{margin-top:18px;color:#777;font-size:8.5pt;text-align:center}
  @media print{body{margin:10mm}}
`;

function printSheet(kind: "report" | "order", rows: PrintRow[], logoUrl: string) {
  const win = window.open("", "_blank");
  if (!win) {
    window.alert("Please allow pop-ups to print the report.");
    return;
  }
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const stamp = `${today.replace(/-/g, "")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const isOrder = kind === "order";
  const title = isOrder ? "Tools Order Form" : "Essential Tools Report";
  const totalQty = rows.reduce((sum, r) => sum + r.toOrder, 0);

  const body = rows
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td class="box"><span></span></td>
        <td class="l">${escapeHtml(r.name)}</td>
        <td class="l">${escapeHtml(r.type)}</td>
        <td class="l">${escapeHtml(r.brand || "-")}</td>
        <td>${r.threshold}</td>
        <td>${r.balance}</td>
        <td class="${r.status.toLowerCase()}">${r.status}</td>
        <td><b>${r.toOrder}</b></td>
        <td class="notes"></td>
      </tr>`,
    )
    .join("");

  const meta = isOrder
    ? `<div class="meta">
        <div><b>Form no.:</b> PO-${stamp}</div>
        <div><b>Date:</b> ${today}</div>
        <div><b>Supplier:</b></div>
        <div><b>Required by:</b></div>
        <div><b>Prepared by:</b></div>
        <div><b>Ref / Job no.:</b></div>
      </div>`
    : `<div class="meta"><div><b>Date:</b> ${today}</div><div><b>Items:</b> ${rows.length}</div></div>`;

  const sign = isOrder
    ? `<div class="sign"><div>Prepared by</div><div>Approved by</div><div>Date approved</div></div>`
    : "";

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} ${today}</title>
<style>${SHEET_CSS}</style></head><body>
<div class="head">
  <img src="${escapeHtml(logoUrl)}" alt="TechPro">
  <div class="t"><h1>${escapeHtml(title)}</h1><div class="sub">TechPro Inventory Console</div></div>
</div>
${meta}
<table>
  <thead><tr><th>#</th><th>${isOrder ? "Ordered" : "Check"}</th><th>Tool</th><th>Type</th><th>Brand</th><th>Threshold</th><th>Balance</th><th>Status</th><th>Qty to order</th><th>Notes</th></tr></thead>
  <tbody>${body || `<tr><td colspan="10">Nothing to report.</td></tr>`}</tbody>
  <tfoot><tr><td colspan="8" style="text-align:right">Total quantity to order</td><td>${totalQty}</td><td></td></tr></tfoot>
</table>
${sign}
<div class="foot">Generated ${today} from TechPro Inventory Console</div>
<script>window.onload=function(){window.focus();setTimeout(function(){window.print()},250);}<\/script>
</body></html>`);
  win.document.close();
}

function EssentialReportPage() {
  const { items, toolTypes, orders, brands } = useStore();
  const [onlyNeeded, setOnlyNeeded] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orderQty, setOrderQty] = useState<Record<string, string>>({});
  const [initialised, setInitialised] = useState(false);

  const lastBrandName = (itemId: string) => {
    const last = orders
      .filter((o) => o.itemId === itemId && o.brandId)
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))[0];
    return last ? (brands.find((b) => b.id === last.brandId)?.name ?? "") : "";
  };
  const logoUrl = () => new URL(techProLogo, window.location.origin).href;

  const typeName = (id: string) => toolTypes.find((t) => t.id === id)?.name ?? "Unassigned";

  const rows = useMemo(
    () =>
      items
        .filter((item) => item.essential)
        .map((item) => {
          const balance = balanceOf(item);
          const status: Status = balance <= 0 ? "Missing" : balance < item.threshold ? "Low" : "OK";
          return {
            id: item.id,
            name: item.name,
            type: typeName(item.typeId),
            threshold: item.threshold,
            balance,
            status,
            suggested: Math.max(0, item.threshold - balance),
          };
        })
        .sort(
          (a, b) =>
            ["Missing", "Low", "OK"].indexOf(a.status) - ["Missing", "Low", "OK"].indexOf(b.status) ||
            a.name.localeCompare(b.name),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, toolTypes],
  );

  // Pre-tick everything that needs ordering the first time data is available.
  useEffect(() => {
    if (initialised || rows.length === 0) return;
    setSelected(new Set(rows.filter((r) => r.status !== "OK").map((r) => r.id)));
    setInitialised(true);
  }, [rows, initialised]);

  const visible = onlyNeeded ? rows.filter((r) => r.status !== "OK") : rows;
  const qtyFor = (row: { id: string; suggested: number }) => {
    const typed = orderQty[row.id];
    return typed !== undefined && typed !== "" ? Math.max(0, Number(typed) || 0) : row.suggested;
  };
  const toPrintRow = (row: (typeof rows)[number]): PrintRow => ({
    name: row.name,
    type: row.type,
    brand: lastBrandName(row.id),
    threshold: row.threshold,
    balance: row.balance,
    status: row.status,
    toOrder: qtyFor(row),
  });

  const missingCount = rows.filter((r) => r.status === "Missing").length;
  const lowCount = rows.filter((r) => r.status === "Low").length;
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visible.forEach((r) => next.delete(r.id));
      else visible.forEach((r) => next.add(r.id));
      return next;
    });

  const statusTone = (status: Status) =>
    status === "Missing"
      ? "bg-destructive/15 text-destructive ring-destructive/25"
      : status === "Low"
        ? "bg-warn-soft text-warn ring-warn/25"
        : "bg-good-soft text-good ring-good/25";

  return (
    <Shell eyebrow="Essentials" title="Essential Tools Report">
      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-base font-semibold">What is missing & what to order</h2>
            <span className="font-mono text-[12px] text-muted-fg">
              {rows.length} essential · {missingCount} missing · {lowCount} low
            </span>
          </div>

          <div className="glass-surface mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-2">
            <button
              type="button"
              onClick={() => setOnlyNeeded((v) => !v)}
              aria-pressed={onlyNeeded}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${
                onlyNeeded
                  ? "bg-accent-brand text-accent-brand-ink ring-accent-brand"
                  : "bg-panel text-muted-fg ring-line hover:text-ink"
              }`}
            >
              {onlyNeeded ? "Showing: needs ordering" : "Showing: all essentials"}
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => printSheet("report", rows.map(toPrintRow), logoUrl())}
                disabled={rows.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-chip px-4 text-sm font-semibold text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink disabled:opacity-50"
              >
                <Printer size={15} /> Print full report
              </button>
              <button
                type="button"
                onClick={() => printSheet("order", selectedRows.map(toPrintRow), logoUrl())}
                disabled={selectedRows.length === 0}
                className="brand-gradient inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110 disabled:opacity-50"
              >
                <ClipboardCheck size={15} /> Generate order form ({selectedRows.length})
              </button>
            </div>
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden grid-cols-[2.5rem_minmax(12rem,1.4fr)_minmax(8rem,0.8fr)_5rem_5rem_6rem_6rem] items-center gap-3 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allVisibleSelected}
                onChange={toggleAll}
                className="size-4 accent-[var(--accent-brand)]"
              />
              <span>Tool</span>
              <span>Type</span>
              <span className="text-right">Threshold</span>
              <span className="text-right">Balance</span>
              <span className="text-center">Status</span>
              <span className="text-right">Order qty</span>
            </div>

            {visible.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-semibold">
                  {rows.length === 0 ? "No essential tools yet" : "All essential tools are stocked"}
                </p>
                <p className="mt-1 text-[12px] text-muted-fg">
                  {rows.length === 0
                    ? "Turn on “Essentials” for an item in Inventory Items to track it here."
                    : "Nothing is missing or below its threshold right now."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {visible.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-start gap-3 px-4 py-3.5 lg:grid lg:grid-cols-[2.5rem_minmax(12rem,1.4fr)_minmax(8rem,0.8fr)_5rem_5rem_6rem_6rem] lg:items-center"
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="mt-1 size-4 shrink-0 accent-[var(--accent-brand)] lg:mt-0"
                    />
                    <div className="min-w-0 flex-1 lg:contents">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.name}</p>
                        <p className="truncate text-[12px] text-muted-fg lg:hidden">{row.type}</p>
                      </div>
                      <span className="hidden truncate text-[12px] text-muted-fg lg:block">{row.type}</span>
                      <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">{row.threshold}</span>
                      <span className="hidden text-right font-mono text-[13px] font-semibold lg:block">{row.balance}</span>
                      <span
                        className={`hidden justify-self-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ring-1 lg:inline-block ${statusTone(row.status)}`}
                      >
                        {row.status}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 lg:hidden">
                        <span className="font-mono text-[11px] text-muted-fg">Thr {row.threshold}</span>
                        <span className="font-mono text-[11px] text-muted-fg">Bal {row.balance}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ${statusTone(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <label className="mt-2 flex items-center gap-2 lg:mt-0 lg:justify-self-end">
                        <span className="text-[11px] text-muted-fg lg:hidden">Order qty</span>
                        <input
                          type="number"
                          min="0"
                          aria-label={`Order quantity for ${row.name}`}
                          value={orderQty[row.id] ?? String(row.suggested)}
                          onChange={(e) => setOrderQty((current) => ({ ...current, [row.id]: e.target.value }))}
                          className="h-9 w-20 rounded-lg bg-panel px-2 text-right font-mono text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-3 px-1 text-[11px] text-muted-fg">
            Missing = balance is 0 or less. Low = balance is below the threshold. Suggested order qty brings the
            balance back up to the threshold; edit it if you want to order a different amount. Tick the rows you
            want and press “Generate order form” to print a check-off sheet.
          </p>
        </section>
      </div>
    </Shell>
  );
}
