// Server-only: uses the service-role client. Never import from a route file
// or a *.functions.ts module at the top level — load it dynamically instead.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import type { ReportResult } from "./pdf-table";

type Db = SupabaseClient<Database>;
type Period = { start: string; end: string };

async function loadLookups(db: Db) {
  const [items, types, brands, users] = await Promise.all([
    db.from("inventory_items").select("id,name,type_id"),
    db.from("tool_types").select("id,name"),
    db.from("brands").select("id,name"),
    db.from("app_users").select("id,name"),
  ]);
  const typeName = new Map((types.data ?? []).map((t) => [t.id, t.name]));
  const itemName = new Map((items.data ?? []).map((i) => [i.id, i.name]));
  const itemType = new Map(
    (items.data ?? []).map((i) => [i.id, i.type_id != null ? (typeName.get(i.type_id) ?? "-") : "-"]),
  );
  return {
    itemName,
    itemType,
    brandName: new Map((brands.data ?? []).map((b) => [b.id, b.name])),
    userName: new Map((users.data ?? []).map((u) => [u.id, u.name])),
  };
}

async function inventoryOrdersReport(db: Db, period: Period): Promise<ReportResult> {
  const [lookups, ordersRes] = await Promise.all([
    loadLookups(db),
    db
      .from("inventory_orders")
      .select("*")
      .gte("purchase_date", period.start)
      .lte("purchase_date", period.end)
      .order("purchase_date", { ascending: false }),
  ]);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

  return {
    columns: [
      { header: "Item", width: 175 },
      { header: "Type", width: 90 },
      { header: "Brand", width: 75 },
      { header: "Purchase date", width: 75 },
      { header: "Qty ordered", width: 60 },
      { header: "Amount", width: 40 },
    ],
    rows: (ordersRes.data ?? []).map((o) => [
      o.item_id != null ? (lookups.itemName.get(o.item_id) ?? `#${o.item_id}`) : "-",
      o.item_id != null ? lookups.itemType.get(o.item_id) ?? "-" : "-",
      o.brand_id != null ? (lookups.brandName.get(o.brand_id) ?? `#${o.brand_id}`) : "-",
      o.purchase_date ?? "-",
      String(o.qty_ordered),
      `$${o.amount.toFixed(2)}`,
    ]),
  };
}

async function inventoryAssignedReport(db: Db, period: Period): Promise<ReportResult> {
  const [lookups, assignedRes] = await Promise.all([
    loadLookups(db),
    db
      .from("inventory_assigned")
      .select("*")
      .gte("issued_date", period.start)
      .lte("issued_date", period.end)
      .order("issued_date", { ascending: false }),
  ]);
  if (assignedRes.error) throw new Error(assignedRes.error.message);

  return {
    columns: [
      { header: "Item", width: 150 },
      { header: "Type", width: 90 },
      { header: "Issued to", width: 80 },
      { header: "Issued date", width: 70 },
      { header: "Qty issued", width: 55 },
      { header: "Job #", width: 70 },
    ],
    rows: (assignedRes.data ?? []).map((a) => [
      a.item_id != null ? (lookups.itemName.get(a.item_id) ?? `#${a.item_id}`) : "-",
      a.item_id != null ? lookups.itemType.get(a.item_id) ?? "-" : "-",
      a.user_id != null ? (lookups.userName.get(a.user_id) ?? `#${a.user_id}`) : "-",
      a.issued_date ?? "-",
      String(a.qty_issued),
      a.job_number ?? "-",
    ]),
  };
}

async function inventoryItemsReport(db: Db): Promise<ReportResult> {
  const [lookups, itemsRes] = await Promise.all([
    loadLookups(db),
    db.from("inventory_items").select("*").order("name"),
  ]);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  return {
    columns: [
      { header: "Item", width: 190 },
      { header: "Type", width: 110 },
      { header: "Ordered", width: 55 },
      { header: "Issued", width: 55 },
      { header: "Balance", width: 55 },
      { header: "Threshold", width: 50 },
    ],
    rows: (itemsRes.data ?? []).map((i) => [
      i.name,
      i.type_id != null ? lookups.itemType.get(i.id) ?? "-" : "-",
      String(i.ordered),
      String(i.issued),
      String(i.ordered - i.issued),
      String(i.threshold),
    ]),
  };
}

function machiningHoursReport(): ReportResult {
  return {
    columns: [{ header: "Note", width: 515 }],
    rows: [["Machining hours tracking isn't set up yet."]],
  };
}

export async function buildReport(db: Db, reportTable: string, period: Period): Promise<ReportResult> {
  switch (reportTable) {
    case "Inventory Orders":
      return inventoryOrdersReport(db, period);
    case "Inventory Assigned":
      return inventoryAssignedReport(db, period);
    case "Inventory Items":
      return inventoryItemsReport(db);
    case "Machining Hours":
      return machiningHoursReport();
    default:
      throw new Error(`Unknown report table: ${reportTable}`);
  }
}
