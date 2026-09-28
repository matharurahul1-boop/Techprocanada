import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { notifyLowStock } from "@/lib/push/actions.functions";

export type ToolType = { id: string; name: string };

export type InventoryItem = {
  id: string;
  name: string;
  typeId: string;
  returnable: "Returnable" | "Consumable";
  ordered: number;
  issued: number;
  threshold: number;
  essential: boolean;
};

export type Brand = { id: string; name: string };

export type Company = { id: string; name: string };

export type Machine = { id: string; name: string };

export type MachineHour = {
  id: string;
  machineId: string;
  operatorId: string;
  workDate: string;
  hours: number;
  jobNumber: string;
  notes: string;
};

export type TimelinessConfiguration = {
  id: string;
  reportName: string;
  reportTable: "Inventory Assigned" | "Inventory Orders" | "Machining Hours" | "Inventory Items" | "Low Stock";
  frequency: "Weekly" | "Monthly" | "Quarterly";
  submissionDay: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  submittedByUserId: string;
};

export type ToolOrder = {
  id: string;
  itemId: string;
  purchaseDate: string;
  brandId: string;
  qtyOrdered: number;
  amount: number;
  documentName: string;
  confirmed?: boolean;
};

export type User = { id: string; name: string; email: string | null; isActive: boolean; hasLogin: boolean };

export type ToolAssignment = {
  id: string;
  itemId: string;
  userId: string;
  issuedFrom: "Admin" | "HR";
  issuedDate: string;
  qtyIssued: number;
  brandId: string;
  remarks: string;
  jobNumber: string;
  drawingNumber: string;
  location: string;
  machineId: string;
};

export type StockNotification = {
  id: string;
  itemId: string;
  itemName: string;
  level: "warning" | "critical";
  balance: number;
  threshold: number;
  createdAt: string;
  read: boolean;
};

type State = {
  toolTypes: ToolType[];
  items: InventoryItem[];
  brands: Brand[];
  companies: Company[];
  machines: Machine[];
  orders: ToolOrder[];
  users: User[];
  assignments: ToolAssignment[];
  machineHours: MachineHour[];
  notifications: StockNotification[];
  timelinessConfigurations: TimelinessConfiguration[];
};

const KEY = "techpro-inventory-v2";

const empty: State = {
  toolTypes: [],
  items: [],
  brands: [],
  companies: [],
  machines: [],
  orders: [],
  users: [],
  assignments: [],
  machineHours: [],
  notifications: [],
  timelinessConfigurations: [],
};

let state: State = empty;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function reportError(action: string, error: { message: string }) {
  console.error(`[store] ${action} failed:`, error.message);
  toast.error(`${action} failed: ${error.message}`);
}

// ---------- Row -> app-model mappers ----------

const mapToolType = (r: Tables<"tool_types">): ToolType => ({ id: String(r.id), name: r.name });
const mapBrand = (r: Tables<"brands">): Brand => ({ id: String(r.id), name: r.name });
const mapCompany = (r: Tables<"companies">): Company => ({ id: String(r.id), name: r.name });
const mapUser = (r: Tables<"app_users">): User => ({
  id: String(r.id),
  name: r.name,
  email: r.email,
  isActive: r.is_active,
  hasLogin: r.auth_user_id != null,
});

const mapItem = (r: Tables<"inventory_items">): InventoryItem => ({
  id: String(r.id),
  name: r.name,
  typeId: r.type_id != null ? String(r.type_id) : "",
  returnable: r.returnable === "Consumable" ? "Consumable" : "Returnable",
  ordered: r.ordered,
  issued: r.issued,
  threshold: r.threshold,
  essential: r.essential,
});

const mapOrder = (r: Tables<"inventory_orders">): ToolOrder => ({
  id: String(r.id),
  itemId: r.item_id != null ? String(r.item_id) : "",
  purchaseDate: r.purchase_date ?? "",
  brandId: r.brand_id != null ? String(r.brand_id) : "",
  qtyOrdered: r.qty_ordered,
  amount: r.amount,
  documentName: r.document_name ?? "",
  confirmed: r.confirmed,
});

const mapAssignment = (r: Tables<"inventory_assigned">): ToolAssignment => ({
  id: String(r.id),
  itemId: r.item_id != null ? String(r.item_id) : "",
  userId: r.user_id != null ? String(r.user_id) : "",
  issuedFrom: "Admin",
  issuedDate: r.issued_date ?? "",
  qtyIssued: r.qty_issued,
  brandId: r.brand_id != null ? String(r.brand_id) : "",
  remarks: r.remarks ?? "",
  jobNumber: r.job_number ?? "",
  drawingNumber: r.drawing_number ?? "",
  location: r.source_location ?? "",
  machineId: r.machine_id != null ? String(r.machine_id) : "",
});

const mapMachine = (r: Tables<"machines">): Machine => ({ id: String(r.id), name: r.name });

const mapMachineHour = (r: Tables<"machine_hours">): MachineHour => ({
  id: String(r.id),
  machineId: r.machine_id != null ? String(r.machine_id) : "",
  operatorId: r.operator_id != null ? String(r.operator_id) : "",
  workDate: r.work_date,
  hours: r.hours,
  jobNumber: r.job_number ?? "",
  notes: r.notes ?? "",
});

const REPORT_TABLES: TimelinessConfiguration["reportTable"][] = [
  "Inventory Assigned",
  "Inventory Orders",
  "Machining Hours",
  "Inventory Items",
  "Low Stock",
];
const FREQUENCIES: TimelinessConfiguration["frequency"][] = ["Weekly", "Monthly", "Quarterly"];
const DAYS: TimelinessConfiguration["submissionDay"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const mapTimeliness = (r: Tables<"timeliness_configurations">): TimelinessConfiguration => ({
  id: String(r.id),
  reportName: r.report_name,
  reportTable: REPORT_TABLES.includes(r.report_table as never)
    ? (r.report_table as TimelinessConfiguration["reportTable"])
    : "Inventory Items",
  frequency: FREQUENCIES.includes(r.frequency as never)
    ? (r.frequency as TimelinessConfiguration["frequency"])
    : "Monthly",
  submissionDay: DAYS.includes(r.submission_day as never)
    ? (r.submission_day as TimelinessConfiguration["submissionDay"])
    : "Monday",
  submittedByUserId: r.submitted_by != null ? String(r.submitted_by) : "",
});

async function loadAll() {
  const [
    toolTypes,
    brands,
    companies,
    machines,
    users,
    items,
    orders,
    assignments,
    machineHours,
    timeliness,
  ] = await Promise.all([
    supabase.from("tool_types").select("*").order("name"),
    supabase.from("brands").select("*").order("name"),
    supabase.from("companies").select("*").order("name"),
    supabase.from("machines").select("*").order("name"),
    supabase.from("app_users").select("*").order("name"),
    supabase.from("inventory_items").select("*").order("name"),
    supabase.from("inventory_orders").select("*").order("purchase_date", { ascending: false }),
    supabase.from("inventory_assigned").select("*").order("issued_date", { ascending: false }),
    supabase.from("machine_hours").select("*").order("work_date", { ascending: false }),
    supabase.from("timeliness_configurations").select("*"),
  ]);

  const firstError = [
    toolTypes,
    brands,
    companies,
    machines,
    users,
    items,
    orders,
    assignments,
    machineHours,
    timeliness,
  ].find((r) => r.error)?.error;
  if (firstError) {
    console.error("[store] initial Supabase load failed:", firstError.message);
    toast.error(`Could not load data from Supabase: ${firstError.message}`);
    return;
  }

  state = {
    ...state,
    toolTypes: (toolTypes.data ?? []).map(mapToolType),
    brands: (brands.data ?? []).map(mapBrand),
    companies: (companies.data ?? []).map(mapCompany),
    machines: (machines.data ?? []).map(mapMachine),
    users: (users.data ?? []).map(mapUser),
    items: (items.data ?? []).map(mapItem),
    orders: (orders.data ?? []).map(mapOrder),
    assignments: (assignments.data ?? []).map(mapAssignment),
    machineHours: (machineHours.data ?? []).map(mapMachineHour),
    timelinessConfigurations: (timeliness.data ?? []).map(mapTimeliness),
  };
  persist();
  emit();
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && Array.isArray(parsed.toolTypes) && Array.isArray(parsed.items)) {
        state = { ...empty, ...parsed };
        emit();
      }
    }
  } catch {
    /* ignore */
  }
  void loadAll();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

const uid = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;
const toDbId = (id: string) => Number(id);
const isSavedId = (id: string) => Number.isFinite(toDbId(id));

export function addToolType(name: string) {
  const tempId = uid();
  state = { ...state, toolTypes: [...state.toolTypes, { id: tempId, name }] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("tool_types")
      .insert({ name })
      .select("id")
      .single();
    if (error) return reportError("Add tool type", error);
    state = {
      ...state,
      toolTypes: state.toolTypes.map((t) => (t.id === tempId ? { ...t, id: String(data.id) } : t)),
    };
    persist();
    emit();
  })();
}

export function updateToolType(id: string, name: string) {
  state = {
    ...state,
    toolTypes: state.toolTypes.map((type) => (type.id === id ? { ...type, name } : type)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("tool_types")
    .update({ name })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update tool type", error));
}

export function removeToolType(id: string) {
  state = {
    ...state,
    toolTypes: state.toolTypes.filter((t) => t.id !== id),
    items: state.items.filter((i) => i.typeId !== id),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void (async () => {
    await supabase.from("inventory_items").delete().eq("type_id", toDbId(id));
    const { error } = await supabase.from("tool_types").delete().eq("id", toDbId(id));
    if (error) reportError("Remove tool type", error);
  })();
}

export function addItem(item: Omit<InventoryItem, "id">) {
  const tempId = uid();
  state = { ...state, items: [{ ...item, id: tempId }, ...state.items] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        name: item.name,
        type_id: item.typeId ? toDbId(item.typeId) : null,
        ordered: item.ordered,
        issued: item.issued,
        threshold: item.threshold,
        returnable: item.returnable,
        essential: item.essential,
      })
      .select("id")
      .single();
    if (error) return reportError("Add item", error);
    state = {
      ...state,
      items: state.items.map((i) => (i.id === tempId ? { ...i, id: String(data.id) } : i)),
    };
    persist();
    emit();
  })();
}

export function updateItem(id: string, patch: Partial<Omit<InventoryItem, "id">>) {
  state = {
    ...state,
    items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  const dbPatch: TablesUpdate<"inventory_items"> = {};
  if (patch.name !== undefined) dbPatch["name"] = patch.name;
  if (patch.typeId !== undefined) dbPatch["type_id"] = patch.typeId ? toDbId(patch.typeId) : null;
  if (patch.ordered !== undefined) dbPatch["ordered"] = patch.ordered;
  if (patch.issued !== undefined) dbPatch["issued"] = patch.issued;
  if (patch.threshold !== undefined) dbPatch["threshold"] = patch.threshold;
  if (patch.returnable !== undefined) dbPatch["returnable"] = patch.returnable;
  if (patch.essential !== undefined) dbPatch["essential"] = patch.essential;
  void supabase
    .from("inventory_items")
    .update(dbPatch)
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update item", error));
}

export function removeItem(id: string) {
  state = { ...state, items: state.items.filter((i) => i.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("inventory_items")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove item", error));
}

export function addBrand(name: string) {
  const tempId = uid();
  state = { ...state, brands: [...state.brands, { id: tempId, name }] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase.from("brands").insert({ name }).select("id").single();
    if (error) return reportError("Add brand", error);
    state = {
      ...state,
      brands: state.brands.map((b) => (b.id === tempId ? { ...b, id: String(data.id) } : b)),
    };
    persist();
    emit();
  })();
}

export function updateBrand(id: string, name: string) {
  state = {
    ...state,
    brands: state.brands.map((brand) => (brand.id === id ? { ...brand, name } : brand)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("brands")
    .update({ name })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update brand", error));
}

export function removeBrand(id: string) {
  state = { ...state, brands: state.brands.filter((b) => b.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("brands")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove brand", error));
}

export function addCompany(name: string) {
  const tempId = uid();
  state = { ...state, companies: [...state.companies, { id: tempId, name }] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase.from("companies").insert({ name }).select("id").single();
    if (error) return reportError("Add company", error);
    state = {
      ...state,
      companies: state.companies.map((c) => (c.id === tempId ? { ...c, id: String(data.id) } : c)),
    };
    persist();
    emit();
  })();
}

export function updateCompany(id: string, name: string) {
  state = {
    ...state,
    companies: state.companies.map((company) =>
      company.id === id ? { ...company, name } : company,
    ),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("companies")
    .update({ name })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update company", error));
}

export function removeCompany(id: string) {
  state = { ...state, companies: state.companies.filter((company) => company.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("companies")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove company", error));
}

export function addMachineHour(entry: Omit<MachineHour, "id">) {
  const tempId = uid();
  state = { ...state, machineHours: [{ ...entry, id: tempId }, ...state.machineHours] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("machine_hours")
      .insert({
        machine_id: entry.machineId ? toDbId(entry.machineId) : null,
        operator_id: entry.operatorId ? toDbId(entry.operatorId) : null,
        work_date: entry.workDate,
        hours: entry.hours,
        job_number: entry.jobNumber || null,
        notes: entry.notes || null,
      })
      .select("id")
      .single();
    if (error) return reportError("Add machine hours", error);
    state = {
      ...state,
      machineHours: state.machineHours.map((m) =>
        m.id === tempId ? { ...m, id: String(data.id) } : m,
      ),
    };
    persist();
    emit();
  })();
}

export function removeMachineHour(id: string) {
  state = { ...state, machineHours: state.machineHours.filter((entry) => entry.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("machine_hours")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove machine hours", error));
}

export function addTimelinessConfiguration(configuration: Omit<TimelinessConfiguration, "id">) {
  const tempId = uid();
  state = {
    ...state,
    timelinessConfigurations: [{ ...configuration, id: tempId }, ...state.timelinessConfigurations],
  };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("timeliness_configurations")
      .insert({
        report_name: configuration.reportName,
        report_table: configuration.reportTable,
        frequency: configuration.frequency,
        submission_day: configuration.submissionDay,
        submitted_by: configuration.submittedByUserId
          ? toDbId(configuration.submittedByUserId)
          : null,
      })
      .select("id")
      .single();
    if (error) return reportError("Add timeliness configuration", error);
    state = {
      ...state,
      timelinessConfigurations: state.timelinessConfigurations.map((entry) =>
        entry.id === tempId ? { ...entry, id: String(data.id) } : entry,
      ),
    };
    persist();
    emit();
  })();
}

export function updateTimelinessConfiguration(
  id: string,
  configuration: Omit<TimelinessConfiguration, "id">,
) {
  state = {
    ...state,
    timelinessConfigurations: state.timelinessConfigurations.map((entry) =>
      entry.id === id ? { ...configuration, id } : entry,
    ),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("timeliness_configurations")
    .update({
      report_name: configuration.reportName,
      report_table: configuration.reportTable,
      frequency: configuration.frequency,
      submission_day: configuration.submissionDay,
      submitted_by: configuration.submittedByUserId
        ? toDbId(configuration.submittedByUserId)
        : null,
    })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update timeliness configuration", error));
}

export function removeTimelinessConfiguration(id: string) {
  state = {
    ...state,
    timelinessConfigurations: state.timelinessConfigurations.filter((entry) => entry.id !== id),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("timeliness_configurations")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove timeliness configuration", error));
}

function bumpItem(itemId: string, patch: { ordered?: number; issued?: number }) {
  let nextOrdered = 0;
  let nextIssued = 0;
  state = {
    ...state,
    items: state.items.map((i) => {
      if (i.id !== itemId) return i;
      nextOrdered = Math.max(0, i.ordered + (patch.ordered ?? 0));
      nextIssued = Math.max(0, i.issued + (patch.issued ?? 0));
      return { ...i, ordered: nextOrdered, issued: nextIssued };
    }),
  };
  if (!isSavedId(itemId)) return;
  void supabase
    .from("inventory_items")
    .update({ ordered: nextOrdered, issued: nextIssued })
    .eq("id", toDbId(itemId))
    .then(({ error }) => error && reportError("Update item balance", error));
}

export function addOrder(order: Omit<ToolOrder, "id">) {
  const tempId = uid();
  state = { ...state, orders: [{ ...order, id: tempId }, ...state.orders] };
  bumpItem(order.itemId, { ordered: order.qtyOrdered });
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("inventory_orders")
      .insert({
        item_id: order.itemId ? toDbId(order.itemId) : null,
        purchase_date: order.purchaseDate || null,
        brand_id: order.brandId ? toDbId(order.brandId) : null,
        qty_ordered: order.qtyOrdered,
        amount: order.amount,
        document_name: order.documentName || null,
      })
      .select("id")
      .single();
    if (error) return reportError("Add order", error);
    state = {
      ...state,
      orders: state.orders.map((o) => (o.id === tempId ? { ...o, id: String(data.id) } : o)),
    };
    persist();
    emit();
  })();
}

export function removeOrder(id: string) {
  const order = state.orders.find((o) => o.id === id);
  state = { ...state, orders: state.orders.filter((o) => o.id !== id) };
  if (order) bumpItem(order.itemId, { ordered: -order.qtyOrdered });
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("inventory_orders")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove order", error));
}

export function updateOrder(id: string, patch: Partial<Pick<ToolOrder, "confirmed">>) {
  state = {
    ...state,
    orders: state.orders.map((order) => (order.id === id ? { ...order, ...patch } : order)),
  };
  persist();
  emit();
  if (!isSavedId(id) || patch.confirmed === undefined) return;
  void supabase
    .from("inventory_orders")
    .update({ confirmed: patch.confirmed })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update order", error));
}

export function addUser(name: string) {
  const tempId = uid();
  state = {
    ...state,
    users: [...state.users, { id: tempId, name, email: null, isActive: true, hasLogin: false }],
  };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase.from("app_users").insert({ name }).select("id").single();
    if (error) return reportError("Add user", error);
    state = {
      ...state,
      users: state.users.map((u) => (u.id === tempId ? { ...u, id: String(data.id) } : u)),
    };
    persist();
    emit();
  })();
}

export function setUserActive(id: string, isActive: boolean) {
  state = {
    ...state,
    users: state.users.map((u) => (u.id === id ? { ...u, isActive } : u)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("app_users")
    .update({ is_active: isActive })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update user status", error));
}

export function removeUser(id: string) {
  state = { ...state, users: state.users.filter((u) => u.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("app_users")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove user", error));
}

export function addAssignment(assignment: Omit<ToolAssignment, "id">): StockNotification | null {
  const item = state.items.find((entry) => entry.id === assignment.itemId);
  const previousBalance = item ? balanceOf(item) : 0;
  const nextBalance = previousBalance - assignment.qtyIssued;
  const level = item
    ? previousBalance > item.threshold && nextBalance === item.threshold
      ? "warning"
      : previousBalance >= item.threshold && nextBalance < item.threshold
        ? "critical"
        : null
    : null;
  const notification: StockNotification | null =
    item && level
      ? {
          id: uid(),
          itemId: item.id,
          itemName: item.name,
          level,
          balance: nextBalance,
          threshold: item.threshold,
          createdAt: new Date().toISOString(),
          read: false,
        }
      : null;
  const tempId = uid();
  state = {
    ...state,
    assignments: [{ ...assignment, id: tempId }, ...state.assignments],
    notifications: notification
      ? [notification, ...state.notifications].slice(0, 50)
      : state.notifications,
  };
  bumpItem(assignment.itemId, { issued: assignment.qtyIssued });
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("inventory_assigned")
      .insert({
        item_id: assignment.itemId ? toDbId(assignment.itemId) : null,
        user_id: assignment.userId ? toDbId(assignment.userId) : null,
        issued_date: assignment.issuedDate || null,
        qty_issued: assignment.qtyIssued,
        brand_id: assignment.brandId ? toDbId(assignment.brandId) : null,
        remarks: assignment.remarks || null,
        job_number: assignment.jobNumber || null,
        drawing_number: assignment.drawingNumber || null,
        source_location: assignment.location || null,
        machine_id: assignment.machineId ? toDbId(assignment.machineId) : null,
      })
      .select("id")
      .single();
    if (error) return reportError("Add assignment", error);
    state = {
      ...state,
      assignments: state.assignments.map((a) =>
        a.id === tempId ? { ...a, id: String(data.id) } : a,
      ),
    };
    persist();
    emit();
  })();
  if (notification) {
    void notifyLowStock({
      data: {
        itemName: notification.itemName,
        level: notification.level,
        balance: notification.balance,
        threshold: notification.threshold,
      },
    }).catch((error: unknown) => console.error("[push] notifyLowStock failed:", error));
  }
  return notification;
}

export function removeAssignment(id: string) {
  const assignment = state.assignments.find((a) => a.id === id);
  state = { ...state, assignments: state.assignments.filter((a) => a.id !== id) };
  if (assignment) bumpItem(assignment.itemId, { issued: -assignment.qtyIssued });
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("inventory_assigned")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove assignment", error));
}

export function markNotificationsRead() {
  if (!state.notifications.some((notification) => !notification.read)) return;
  state = {
    ...state,
    notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
  };
  persist();
  emit();
}

export function clearNotifications() {
  state = { ...state, notifications: [] };
  persist();
  emit();
}

export const balanceOf = (i: InventoryItem) => i.ordered - i.issued;
export const isLow = (i: InventoryItem) => balanceOf(i) <= i.threshold;
