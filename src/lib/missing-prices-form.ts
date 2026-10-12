import techProLogo from "@/assets/techpro-logo.png";
import type { Brand, InventoryItem, ToolOrder, ToolType } from "@/lib/store";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const formatDate = (value: string) => {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export type MissingPriceRow = {
  tool: string;
  type: string;
  brand: string;
  orders: number;
  qty: number;
  lastPurchase: string;
};

/** One row per tool + brand whose order lines have no price (amount is 0). */
export function missingPriceRows(
  orders: ToolOrder[],
  items: InventoryItem[],
  brands: Brand[],
  toolTypes: ToolType[],
): MissingPriceRow[] {
  const itemById = new Map(items.map((i) => [i.id, i]));
  const typeById = new Map(toolTypes.map((t) => [t.id, t.name]));
  const brandById = new Map(brands.map((b) => [b.id, b.name]));
  const grouped = new Map<string, MissingPriceRow>();

  for (const order of orders) {
    if (order.amount > 0) continue;
    const item = itemById.get(order.itemId);
    const brand = brandById.get(order.brandId) ?? "";
    const key = `${order.itemId}|${order.brandId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.orders += 1;
      existing.qty += order.qtyOrdered;
      if (order.purchaseDate > existing.lastPurchase) existing.lastPurchase = order.purchaseDate;
    } else {
      grouped.set(key, {
        tool: item?.name ?? "Removed item",
        type: item ? (typeById.get(item.typeId) ?? "Unassigned") : "Unassigned",
        brand,
        orders: 1,
        qty: order.qtyOrdered,
        lastPurchase: order.purchaseDate,
      });
    }
  }

  return [...grouped.values()].sort((a, b) => a.tool.localeCompare(b.tool) || a.brand.localeCompare(b.brand));
}

const CSS = `
  *{box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11pt;margin:28px;color:#111}
  .head{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #c81717;padding-bottom:10px;margin-bottom:14px}
  .head img{height:56px} .head .t{text-align:right}
  h1{margin:0;font-size:20pt} .sub{color:#555;font-size:10pt;margin-top:2px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:14px}
  .meta div{border-bottom:1px solid #000;padding:4px 0;font-size:10pt;min-height:24px}
  .meta b{display:inline-block;min-width:92px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #000;padding:6px 7px;text-align:center;font-size:9.5pt}
  th{background:#eee} td.l{text-align:left}
  td.fill{width:14%} td.notes{width:16%}
  tr{page-break-inside:avoid} thead{display:table-header-group}
  .sign{display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;margin-top:46px}
  .sign div{border-top:1px solid #000;padding-top:4px;font-size:9.5pt;text-align:center}
  .foot{margin-top:18px;color:#777;font-size:8.5pt;text-align:center}
  @media print{body{margin:10mm}}
`;

export function printMissingPricesForm(rows: MissingPriceRow[]) {
  const win = window.open("", "_blank");
  if (!win) {
    window.alert("Please allow pop-ups to print the form.");
    return;
  }
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const stamp = `${today.replace(/-/g, "")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const logoUrl = new URL(techProLogo, window.location.origin).href;
  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0);

  const body = rows
    .map(
      (r, i) => `<tr>
        <td>${i + 1}</td>
        <td class="l">${escapeHtml(r.tool)}</td>
        <td class="l">${escapeHtml(r.type)}</td>
        <td class="l">${escapeHtml(r.brand || "-")}</td>
        <td>${r.orders}</td>
        <td>${r.qty}</td>
        <td>${formatDate(r.lastPurchase)}</td>
        <td class="fill"></td>
        <td class="fill"></td>
        <td class="notes"></td>
      </tr>`,
    )
    .join("");

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Missing Prices Form ${today}</title>
<style>${CSS}</style></head><body>
<div class="head">
  <img src="${escapeHtml(logoUrl)}" alt="TechPro">
  <div class="t"><h1>Missing Prices Form</h1><div class="sub">TechPro Inventory Console</div></div>
</div>
<div class="meta">
  <div><b>Form no.:</b> MP-${stamp}</div>
  <div><b>Date:</b> ${today}</div>
  <div><b>Completed by:</b></div>
  <div><b>Tools listed:</b> ${rows.length}</div>
</div>
<table>
  <thead><tr><th>#</th><th>Tool</th><th>Type</th><th>Brand</th><th>Orders</th><th>Total qty</th><th>Last purchase</th><th>Unit price</th><th>Total amount</th><th>Notes</th></tr></thead>
  <tbody>${body || `<tr><td colspan="10">All ordered tools have a price.</td></tr>`}</tbody>
  <tfoot><tr><td colspan="5" style="text-align:right;font-weight:bold">Total quantity</td><td style="font-weight:bold">${totalQty}</td><td colspan="4"></td></tr></tfoot>
</table>
<div class="sign"><div>Completed by</div><div>Checked by</div><div>Date</div></div>
<div class="foot">Orders with an amount of 0 are treated as missing a price. Generated ${today}.</div>
<script>window.onload=function(){window.focus();setTimeout(function(){window.print()},250);}<\/script>
</body></html>`);
  win.document.close();
}
