import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { notifyLowStock } from "@/lib/push/actions.functions";
import { daysLeft as daysBetween, poAmountFor, today as todayDate } from "@/lib/job-format";

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

export type CompanyPriority = "Low" | "Modest" | "High";

export type Company = {
  id: string;
  name: string;
  priority: CompanyPriority;
  address: string;
  contactNumber: string;
};

export type CompanyInput = Omit<Company, "id">;

// In the order of the old system's status dropdown (its codes 1, 2, 3, 5, 6, 7, 8).
export const JOB_STATUSES = [
  "In Progress",
  "Completed",
  "Not Started",
  "Mistake",
  "Shipped",
  "Requires Attention",
  "Partially Completed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/** The old system's numeric job status codes (mii_job_number.status). */
export const JOB_STATUS_CODE: Record<JobStatus, number> = {
  "In Progress": 1,
  Completed: 2,
  "Not Started": 3,
  Mistake: 5,
  Shipped: 6,
  "Requires Attention": 7,
  "Partially Completed": 8,
};

const jobStatusFromCode = (code: number | null): JobStatus =>
  JOB_STATUSES.find((status) => JOB_STATUS_CODE[status] === code) ?? "Not Started";

/** Currency codes used by the old system's jobs (mii_job_number.currency). */
export const CURRENCIES: Record<number, string> = { 1: "CAD", 2: "USD" };

export type Job = {
  id: string;
  companyId: string;
  jobNumber: string;
  date: string;
  dueDate: string;
  numberOfItems: number;
  completedItems: number;
  job: string;
  status: JobStatus;
  poNumber: string;
  shipDate: string;
  // Storage paths inside the "packing-slips" bucket.
  packingSlips: string[];
  priority: boolean;
};

export type JobInput = Omit<Job, "id">;

export type MachiningHour = {
  id: string;
  date: string;
  userId: string;
  machineId: string;
  description: string;
  jobId: string;
  drawingNumber: string;
  // Time worked, in whole minutes (shown as h:mm); null when not entered.
  durationMinutes: number | null;
  // Pieces worked on; null when not entered.
  quantity: number | null;
};

export type MachiningHourInput = Omit<MachiningHour, "id">;

// Drawings use the same statuses, in the same order, as jobs.
export const MII_ORDER_STATUSES = JOB_STATUSES;

export type MiiOrderStatus = (typeof MII_ORDER_STATUSES)[number];

export type MiiOrderDetail = {
  id: string;
  jobId: string;
  drawingNumber: string;
  drawingName: string;
  quantity: number;
  quantityCompleted: number;
  orderStatus: MiiOrderStatus;
  completed: boolean;
  completedDate: string;
  inspected: boolean;
  shipment: boolean;
  shipmentDate: string;
  remarks: string;
  // Durations in whole minutes; null when not entered.
  quotedMinutes: number | null;
  actualMinutes: number | null;
};

export type MiiOrderDetailInput = Omit<MiiOrderDetail, "id">;

export type QuotedHour = {
  id: string;
  jobId: string;
  // Picked from mii_order_details for the selected job.
  drawingNumber: string;
  quantity: number;
  machineId: string;
  jobHours: number;
  rate: number;
  description: string;
  timeRemaining: string;
};

export type QuotedHourInput = Omit<QuotedHour, "id">;

// Backed by the mii_inspections table.
export type Inspection = {
  id: string;
  // Both point at mii_order_details rows: one for its job, one for its drawing.
  jobDetailId: string;
  drawingDetailId: string;
  // Storage paths inside the "inspection-documents" bucket.
  documents: string[];
  // ISO timestamp of when the inspection was submitted.
  createdAt: string;
};

export type InspectionInput = Omit<Inspection, "id" | "createdAt">;

// "Jobs New" page; backed by the mii_job_number table, laid out like the old system's.
export type MiiJob = {
  id: string;
  jobNumber: string;
  poNumber: string;
  companyId: string;
  date: string;
  dueDate: string;
  numberOfItems: number;
  completedItems: number;
  status: JobStatus;
  shippedDate: string;
  amount: number | null;
  // A CURRENCIES code; null when not set.
  currency: number | null;
  poAmount: number | null;
  essential: boolean;
  inspection: boolean;
  remarks: string;
};

export type MiiJobInput = Omit<MiiJob, "id">;

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
  jobs: Job[];
  machiningHours: MachiningHour[];
  miiOrderDetails: MiiOrderDetail[];
  quotedHours: QuotedHour[];
  inspections: Inspection[];
  miiJobs: MiiJob[];
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
  jobs: [],
  machiningHours: [],
  miiOrderDetails: [],
  quotedHours: [],
  inspections: [],
  miiJobs: [],
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
  state = withActualHours(state);
  listeners.forEach((l) => l());
}

/** Machining minutes logged against a job and drawing number; null when none are. */
export function actualMinutesFor(
  jobId: string,
  drawingNumber: string,
  entries: MachiningHour[] = state.machiningHours,
): number | null {
  let total: number | null = null;
  for (const entry of entries) {
    if (entry.jobId !== jobId || entry.drawingNumber !== drawingNumber) continue;
    if (entry.durationMinutes == null) continue;
    total = (total ?? 0) + entry.durationMinutes;
  }
  return total;
}

// Old-system rule: a drawing's actual hours are the sum of the machining hours logged
// against its job and drawing number. Recomputed on every change, so it is never typed in.
function withActualHours(current: State): State {
  const totals = new Map<string, number>();
  for (const entry of current.machiningHours) {
    if (!entry.jobId || !entry.drawingNumber || entry.durationMinutes == null) continue;
    const key = `${entry.jobId}|${entry.drawingNumber}`;
    totals.set(key, (totals.get(key) ?? 0) + entry.durationMinutes);
  }
  let changed = false;
  const details = current.miiOrderDetails.map((detail) => {
    const total = totals.get(`${detail.jobId}|${detail.drawingNumber}`) ?? null;
    if (total === detail.actualMinutes) return detail;
    changed = true;
    return { ...detail, actualMinutes: total };
  });
  return changed ? { ...current, miiOrderDetails: details } : current;
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
const mapCompany = (r: Tables<"companies">): Company => ({
  id: String(r.id),
  name: r.name,
  priority: (r.priority as CompanyPriority | null) ?? "Low",
  address: r.address ?? "",
  contactNumber: r.contact_number ?? "",
});

const toCompanyRow = (c: CompanyInput) => ({
  name: c.name,
  priority: c.priority,
  address: c.address,
  contact_number: c.contactNumber,
});

const mapJob = (r: Tables<"jobs">): Job => ({
  id: String(r.id),
  companyId: r.company_id != null ? String(r.company_id) : "",
  jobNumber: r.job_number,
  date: r.job_date ?? "",
  dueDate: r.due_date ?? "",
  numberOfItems: r.number_of_items,
  completedItems: r.completed_items,
  job: r.job,
  status: JOB_STATUSES.includes(r.status as never) ? (r.status as JobStatus) : "Not Started",
  poNumber: r.po_number,
  shipDate: r.ship_date ?? "",
  packingSlips: r.packing_slips ?? [],
  priority: r.priority,
});

const toJobRow = (j: JobInput) => ({
  company_id: j.companyId ? toDbId(j.companyId) : null,
  job_number: j.jobNumber,
  job_date: j.date || null,
  due_date: j.dueDate || null,
  number_of_items: j.numberOfItems,
  completed_items: j.completedItems,
  job: j.job,
  status: j.status,
  po_number: j.poNumber,
  ship_date: j.shipDate || null,
  packing_slips: j.packingSlips,
  priority: j.priority,
});

const mapMachiningHour = (r: Tables<"machining_hours">): MachiningHour => ({
  id: String(r.id),
  date: r.work_date ?? "",
  userId: r.user_id != null ? String(r.user_id) : "",
  machineId: r.machine_id != null ? String(r.machine_id) : "",
  description: r.description,
  jobId: r.job_id != null ? String(r.job_id) : "",
  drawingNumber: r.drawing_number,
  durationMinutes: r.duration_minutes,
  quantity: r.quantity,
});

const toMachiningHourRow = (m: MachiningHourInput) => ({
  work_date: m.date || null,
  user_id: m.userId ? toDbId(m.userId) : null,
  machine_id: m.machineId ? toDbId(m.machineId) : null,
  description: m.description,
  job_id: m.jobId ? toDbId(m.jobId) : null,
  drawing_number: m.drawingNumber,
  duration_minutes: m.durationMinutes,
  quantity: m.quantity,
});

const mapMiiOrderDetail = (r: Tables<"mii_order_details">): MiiOrderDetail => ({
  id: String(r.id),
  jobId: r.job_id != null ? String(r.job_id) : "",
  drawingNumber: r.drawing_number,
  drawingName: r.drawing_name,
  quantity: r.quantity,
  quantityCompleted: r.quantity_completed,
  orderStatus: MII_ORDER_STATUSES.includes(r.order_status as never)
    ? (r.order_status as MiiOrderStatus)
    : "Not Started",
  completed: r.completed,
  completedDate: r.completed_date ?? "",
  inspected: r.inspected,
  shipment: r.shipment,
  shipmentDate: r.shipment_date ?? "",
  remarks: r.remarks,
  quotedMinutes: r.quoted_minutes,
  actualMinutes: r.actual_minutes,
});

const toMiiOrderDetailRow = (d: MiiOrderDetailInput) => ({
  job_id: d.jobId ? toDbId(d.jobId) : null,
  drawing_number: d.drawingNumber,
  drawing_name: d.drawingName,
  quantity: d.quantity,
  quantity_completed: d.quantityCompleted,
  order_status: d.orderStatus,
  completed: d.completed,
  completed_date: d.completedDate || null,
  inspected: d.inspected,
  shipment: d.shipment,
  shipment_date: d.shipmentDate || null,
  remarks: d.remarks,
  quoted_minutes: d.quotedMinutes,
  actual_minutes: d.actualMinutes,
});

const mapQuotedHour = (r: Tables<"quoted_hours">): QuotedHour => ({
  id: String(r.id),
  jobId: r.job_id != null ? String(r.job_id) : "",
  drawingNumber: r.drawing_number,
  quantity: r.quantity,
  machineId: r.machine_id != null ? String(r.machine_id) : "",
  jobHours: r.job_hours,
  rate: r.rate,
  description: r.description,
  timeRemaining: r.time_remaining,
});

const toQuotedHourRow = (q: QuotedHourInput) => ({
  job_id: q.jobId ? toDbId(q.jobId) : null,
  drawing_number: q.drawingNumber,
  quantity: q.quantity,
  machine_id: q.machineId ? toDbId(q.machineId) : null,
  job_hours: q.jobHours,
  rate: q.rate,
  description: q.description,
  time_remaining: q.timeRemaining,
});

const mapInspection = (r: Tables<"mii_inspections">): Inspection => ({
  id: String(r.id),
  jobDetailId: r.job != null ? String(r.job) : "",
  drawingDetailId: r.drawing != null ? String(r.drawing) : "",
  documents: r.supporting_documents ?? [],
  createdAt: r.created_at ?? "",
});

// created_at / updated_at / created_by / updated_by are filled in by a database trigger.
const toInspectionRow = (i: InspectionInput) => ({
  job: i.jobDetailId ? toDbId(i.jobDetailId) : null,
  drawing: i.drawingDetailId ? toDbId(i.drawingDetailId) : null,
  supporting_documents: i.documents,
});

const mapMiiJob = (r: Tables<"mii_job_number">): MiiJob => ({
  id: String(r.id),
  jobNumber: r.job_no,
  poNumber: r.po_no,
  companyId: r.company != null ? String(r.company) : "",
  date: r.date ?? "",
  dueDate: r.due_date ?? "",
  numberOfItems: r.no_of_items ?? 0,
  completedItems: r.completed_items ?? 0,
  status: jobStatusFromCode(r.status),
  shippedDate: r.shipped_date ?? "",
  amount: r.amount,
  currency: r.currency,
  poAmount: r.po_amount,
  essential: r.essential,
  inspection: r.inspection,
  remarks: r.remarks,
});

const toMiiJobRow = (j: MiiJobInput) => ({
  job_no: j.jobNumber,
  po_no: j.poNumber,
  company: j.companyId ? toDbId(j.companyId) : null,
  date: j.date || null,
  due_date: j.dueDate || null,
  no_of_items: j.numberOfItems,
  completed_items: j.completedItems,
  status: JOB_STATUS_CODE[j.status],
  // Kept in step with the dates for anything else reading the table; the app never reads it.
  days_left_behind: daysBetween(j.date, j.dueDate),
  shipped_date: j.shippedDate || null,
  amount: j.amount,
  currency: j.currency,
  po_amount: j.poAmount,
  essential: j.essential,
  inspection: j.inspection,
  remarks: j.remarks,
});
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

type QueryResult<Row> = { data: Row[] | null; error: { message: string } | null };

/**
 * Loads one table into the store, retrying once after a pause: a request can fail
 * while the login token is being refreshed (e.g. after the laptop slept) and works a
 * moment later. Resolves to an error line when both tries fail, else null.
 */
async function loadTable<Row>(
  label: string,
  query: () => PromiseLike<QueryResult<Row>>,
  apply: (rows: Row[]) => void,
): Promise<string | null> {
  let message = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    const { data, error } = await query();
    if (!error) {
      apply(data ?? []);
      emit();
      return null;
    }
    message = error.message;
  }
  console.error(`[store] ${label} load failed:`, message);
  return `${label}: ${message}`;
}

let loading: Promise<void> | null = null;
let lastLoadedAt = 0;

// Every table loads on its own, so one failing table no longer stops the others
// from loading (it used to leave whole pages empty until a reload).
async function loadEverything() {
  const failures = await Promise.all([
    loadTable(
      "Tool types",
      () => supabase.from("tool_types").select("*").order("name"),
      (rows) => (state = { ...state, toolTypes: rows.map(mapToolType) }),
    ),
    loadTable(
      "Brands",
      () => supabase.from("brands").select("*").order("name"),
      (rows) => (state = { ...state, brands: rows.map(mapBrand) }),
    ),
    loadTable(
      "Companies",
      () => supabase.from("companies").select("*").order("id", { ascending: false }),
      (rows) => (state = { ...state, companies: rows.map(mapCompany) }),
    ),
    loadTable(
      "Machines",
      () => supabase.from("machines").select("*").order("name"),
      (rows) => (state = { ...state, machines: rows.map(mapMachine) }),
    ),
    loadTable(
      "Users",
      () => supabase.from("app_users").select("*").order("name"),
      (rows) => (state = { ...state, users: rows.map(mapUser) }),
    ),
    loadTable(
      "Inventory items",
      () => supabase.from("inventory_items").select("*").order("name"),
      (rows) => (state = { ...state, items: rows.map(mapItem) }),
    ),
    loadTable(
      "Orders",
      () =>
        supabase.from("inventory_orders").select("*").order("purchase_date", { ascending: false }),
      (rows) => (state = { ...state, orders: rows.map(mapOrder) }),
    ),
    loadTable(
      "Tool assignments",
      () =>
        supabase.from("inventory_assigned").select("*").order("issued_date", { ascending: false }),
      (rows) => (state = { ...state, assignments: rows.map(mapAssignment) }),
    ),
    loadTable(
      "Machine hours",
      () => supabase.from("machine_hours").select("*").order("work_date", { ascending: false }),
      (rows) => (state = { ...state, machineHours: rows.map(mapMachineHour) }),
    ),
    loadTable(
      "Timeliness configurations",
      () => supabase.from("timeliness_configurations").select("*"),
      (rows) => (state = { ...state, timelinessConfigurations: rows.map(mapTimeliness) }),
    ),
    loadTable(
      "Jobs",
      () => supabase.from("jobs").select("*").order("id", { ascending: false }),
      (rows) => (state = { ...state, jobs: rows.map(mapJob) }),
    ),
    loadTable(
      "Machining hours",
      () => supabase.from("machining_hours").select("*").order("work_date", { ascending: false }),
      (rows) => (state = { ...state, machiningHours: rows.map(mapMachiningHour) }),
    ),
    loadTable(
      "MII order details",
      () => supabase.from("mii_order_details").select("*").order("id", { ascending: false }),
      (rows) => (state = { ...state, miiOrderDetails: rows.map(mapMiiOrderDetail) }),
    ),
    loadTable(
      "Quoted hours",
      () => supabase.from("quoted_hours").select("*").order("id", { ascending: false }),
      (rows) => (state = { ...state, quotedHours: rows.map(mapQuotedHour) }),
    ),
    loadTable(
      "Inspections",
      () => supabase.from("mii_inspections").select("*").order("created_at", { ascending: false }),
      (rows) => (state = { ...state, inspections: rows.map(mapInspection) }),
    ),
    loadTable(
      "Jobs New",
      () => supabase.from("mii_job_number").select("*").order("id", { ascending: false }),
      (rows) => (state = { ...state, miiJobs: rows.map(mapMiiJob) }),
    ),
  ]);
  lastLoadedAt = Date.now();
  persist();

  const failed = failures.filter((line): line is string => line !== null);
  if (failed.length > 0) {
    toast.error(`Could not load ${failed.length === 1 ? "a table" : `${failed.length} tables`}`, {
      description: failed.join("\n"),
      action: { label: "Retry", onClick: () => void loadAll() },
    });
  }
}

/** (Re)loads every table from Supabase; calls made while a load is running share it. */
function loadAll(): Promise<void> {
  loading ??= loadEverything().finally(() => {
    loading = null;
  });
  return loading;
}

// Data older than this is refreshed when the user comes back to the tab.
const STALE_AFTER_MS = 5 * 60_000;

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

  // Signing in again without a page reload (or as someone else) reloads the data;
  // signing out drops it, so the next person on this browser never sees the last one's.
  let userId: string | null | undefined;
  supabase.auth.onAuthStateChange((event, session) => {
    const nextUserId = session?.user.id ?? null;
    if (event === "SIGNED_OUT") {
      state = empty;
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      emit();
    } else if (event === "SIGNED_IN" && userId !== undefined && nextUserId !== userId) {
      // Supabase asks not to call it from inside this callback, so load on the next tick.
      setTimeout(() => void loadAll(), 0);
    }
    userId = nextUserId;
  });

  // Coming back to a tab that sat idle refreshes data that may have changed elsewhere.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastLoadedAt > STALE_AFTER_MS) {
      void loadAll();
    }
  });
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

export function addMachine(name: string) {
  const tempId = uid();
  state = { ...state, machines: [...state.machines, { id: tempId, name }] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase.from("machines").insert({ name }).select("id").single();
    if (error) return reportError("Add machine", error);
    state = {
      ...state,
      machines: state.machines.map((m) => (m.id === tempId ? { ...m, id: String(data.id) } : m)),
    };
    persist();
    emit();
  })();
}

export function updateMachine(id: string, name: string) {
  state = {
    ...state,
    machines: state.machines.map((machine) => (machine.id === id ? { ...machine, name } : machine)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("machines")
    .update({ name })
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update machine", error));
}

export function removeMachine(id: string) {
  state = { ...state, machines: state.machines.filter((m) => m.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("machines")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove machine", error));
}

export function addCompany(company: CompanyInput) {
  const tempId = uid();
  state = { ...state, companies: [{ id: tempId, ...company }, ...state.companies] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("companies")
      .insert(toCompanyRow(company))
      .select("id")
      .single();
    if (error) return reportError("Add company", error);
    state = {
      ...state,
      companies: state.companies.map((c) => (c.id === tempId ? { ...c, id: String(data.id) } : c)),
    };
    persist();
    emit();
  })();
}

export function updateCompany(id: string, company: CompanyInput) {
  state = {
    ...state,
    companies: state.companies.map((existing) =>
      existing.id === id ? { ...existing, ...company } : existing,
    ),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("companies")
    .update(toCompanyRow(company))
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

// ---------- File storage (private buckets, opened via short-lived signed URLs) ----------

const PACKING_SLIPS_BUCKET = "packing-slips";
const INSPECTION_DOCS_BUCKET = "inspection-documents";

async function uploadToBucket(bucket: string, file: File): Promise<string | null> {
  // A folder per upload keeps the original file name without collisions.
  const path = `${crypto.randomUUID()}/${file.name}`;
  // The file type is stored with it so the browser can show it instead of downloading it.
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, file.type ? { contentType: file.type } : {});
  if (error) {
    reportError(`Upload ${file.name}`, error);
    return null;
  }
  return path;
}

function removeFromBucket(bucket: string, paths: string[], label: string) {
  if (paths.length === 0) return;
  void supabase.storage
    .from(bucket)
    .remove(paths)
    .then(({ error }) => error && reportError(`Remove ${label}`, error));
}

async function signedUrl(bucket: string, path: string, label: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  if (error) {
    reportError(`Open ${label}`, error);
    return null;
  }
  return data.signedUrl;
}

export const uploadPackingSlip = (file: File) => uploadToBucket(PACKING_SLIPS_BUCKET, file);
export const removePackingSlips = (paths: string[]) =>
  removeFromBucket(PACKING_SLIPS_BUCKET, paths, "packing slip");
export const getPackingSlipUrl = (path: string) =>
  signedUrl(PACKING_SLIPS_BUCKET, path, "packing slip");

export const uploadInspectionDocument = (file: File) => uploadToBucket(INSPECTION_DOCS_BUCKET, file);
export const removeInspectionDocuments = (paths: string[]) =>
  removeFromBucket(INSPECTION_DOCS_BUCKET, paths, "inspection document");
const ORDER_DOCS_BUCKET = "order-documents";
export const uploadOrderDocument = (file: File) => uploadToBucket(ORDER_DOCS_BUCKET, file);
export const removeOrderDocuments = (paths: string[]) =>
  removeFromBucket(ORDER_DOCS_BUCKET, paths, "order document");
export const getOrderDocumentUrl = (path: string) =>
  signedUrl(ORDER_DOCS_BUCKET, path, "order document");
/**
 * Uploaded files are stored as "<folder>/<file name>"; older orders only kept the
 * file name, so there is nothing to open for them.
 */
export const isStoredDocument = (value: string) => value.includes("/");

export const getInspectionDocumentUrl = (path: string) =>
  signedUrl(INSPECTION_DOCS_BUCKET, path, "inspection document");

/** Resolves to the saved job's id, or null when the insert failed. */
export function addJob(job: JobInput): Promise<string | null> {
  const tempId = uid();
  state = { ...state, jobs: [{ id: tempId, ...job }, ...state.jobs] };
  persist();
  emit();
  return (async () => {
    const { data, error } = await supabase.from("jobs").insert(toJobRow(job)).select("id").single();
    if (error) {
      reportError("Add job", error);
      return null;
    }
    state = {
      ...state,
      jobs: state.jobs.map((j) => (j.id === tempId ? { ...j, id: String(data.id) } : j)),
    };
    persist();
    emit();
    return String(data.id);
  })();
}

export function updateJob(id: string, job: JobInput) {
  state = {
    ...state,
    jobs: state.jobs.map((existing) => (existing.id === id ? { ...existing, ...job } : existing)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("jobs")
    .update(toJobRow(job))
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update job", error));
}

export function removeJob(id: string) {
  const job = state.jobs.find((j) => j.id === id);
  state = { ...state, jobs: state.jobs.filter((j) => j.id !== id) };
  persist();
  emit();
  if (job) removePackingSlips(job.packingSlips);
  if (!isSavedId(id)) return;
  void supabase
    .from("jobs")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove job", error));
}

export function addMachiningHour(entry: MachiningHourInput) {
  const tempId = uid();
  state = { ...state, machiningHours: [{ id: tempId, ...entry }, ...state.machiningHours] };
  persist();
  emit();
  markWorkStarted(entry);
  void (async () => {
    const { data, error } = await supabase
      .from("machining_hours")
      .insert(toMachiningHourRow(entry))
      .select("id")
      .single();
    if (error) return reportError("Add machining hours", error);
    state = {
      ...state,
      machiningHours: state.machiningHours.map((m) =>
        m.id === tempId ? { ...m, id: String(data.id) } : m,
      ),
    };
    persist();
    emit();
  })();
}

export function updateMachiningHour(id: string, entry: MachiningHourInput) {
  const previous = state.machiningHours.find((m) => m.id === id);
  state = {
    ...state,
    machiningHours: state.machiningHours.map((existing) =>
      existing.id === id ? { ...existing, ...entry } : existing,
    ),
  };
  persist();
  emit();
  if (previous?.durationMinutes !== entry.durationMinutes) markWorkStarted(entry);
  if (!isSavedId(id)) return;
  void supabase
    .from("machining_hours")
    .update(toMachiningHourRow(entry))
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update machining hours", error));
}

export function removeMachiningHour(id: string) {
  state = { ...state, machiningHours: state.machiningHours.filter((m) => m.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("machining_hours")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove machining hours", error));
}

/** Resolves to the saved row's id, or null when the insert failed. */
export function addMiiOrderDetail(input: MiiOrderDetailInput): Promise<string | null> {
  const detail = applyDrawingRules(input);
  const tempId = uid();
  state = { ...state, miiOrderDetails: [{ id: tempId, ...detail }, ...state.miiOrderDetails] };
  persist();
  emit();
  syncJobFromDrawings(detail.jobId);
  return (async () => {
    const { data, error } = await supabase
      .from("mii_order_details")
      .insert(toMiiOrderDetailRow(detail))
      .select("id")
      .single();
    if (error) {
      reportError("Add MII order detail", error);
      return null;
    }
    state = {
      ...state,
      miiOrderDetails: state.miiOrderDetails.map((d) =>
        d.id === tempId ? { ...d, id: String(data.id) } : d,
      ),
    };
    persist();
    emit();
    return String(data.id);
  })();
}

/** Saves a drawing. `rules` = false skips the status rules (used when hours start work). */
export function updateMiiOrderDetail(id: string, input: MiiOrderDetailInput, rules = true) {
  const detail = rules ? applyDrawingRules(input) : input;
  const previousJobId = state.miiOrderDetails.find((d) => d.id === id)?.jobId;
  state = {
    ...state,
    miiOrderDetails: state.miiOrderDetails.map((existing) =>
      existing.id === id ? { ...existing, ...detail } : existing,
    ),
  };
  persist();
  emit();
  syncJobFromDrawings(detail.jobId);
  if (previousJobId && previousJobId !== detail.jobId) syncJobFromDrawings(previousJobId);
  if (!isSavedId(id)) return;
  void supabase
    .from("mii_order_details")
    .update(toMiiOrderDetailRow(detail))
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update MII order detail", error));
}

export function removeMiiOrderDetail(id: string) {
  const jobId = state.miiOrderDetails.find((d) => d.id === id)?.jobId;
  state = { ...state, miiOrderDetails: state.miiOrderDetails.filter((d) => d.id !== id) };
  persist();
  emit();
  if (jobId) syncJobFromDrawings(jobId);
  if (!isSavedId(id)) return;
  void supabase
    .from("mii_order_details")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove MII order detail", error));
}

export function addQuotedHour(quote: QuotedHourInput) {
  const tempId = uid();
  state = { ...state, quotedHours: [{ id: tempId, ...quote }, ...state.quotedHours] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("quoted_hours")
      .insert(toQuotedHourRow(quote))
      .select("id")
      .single();
    if (error) return reportError("Add quoted hours", error);
    state = {
      ...state,
      quotedHours: state.quotedHours.map((q) => (q.id === tempId ? { ...q, id: String(data.id) } : q)),
    };
    persist();
    emit();
  })();
}

export function updateQuotedHour(id: string, quote: QuotedHourInput) {
  state = {
    ...state,
    quotedHours: state.quotedHours.map((existing) =>
      existing.id === id ? { ...existing, ...quote } : existing,
    ),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("quoted_hours")
    .update(toQuotedHourRow(quote))
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update quoted hours", error));
}

export function removeQuotedHour(id: string) {
  state = { ...state, quotedHours: state.quotedHours.filter((q) => q.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("quoted_hours")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove quoted hours", error));
}

/** Resolves to the saved row's id, or null when the insert failed. */
export function addInspection(inspection: InspectionInput): Promise<string | null> {
  const tempId = uid();
  state = {
    ...state,
    inspections: [
      { id: tempId, createdAt: new Date().toISOString(), ...inspection },
      ...state.inspections,
    ],
  };
  persist();
  emit();
  return (async () => {
    const { data, error } = await supabase
      .from("mii_inspections")
      .insert(toInspectionRow(inspection))
      .select("id")
      .single();
    if (error) {
      reportError("Add inspection", error);
      return null;
    }
    state = {
      ...state,
      inspections: state.inspections.map((i) => (i.id === tempId ? { ...i, id: String(data.id) } : i)),
    };
    persist();
    emit();
    return String(data.id);
  })();
}

export function updateInspection(id: string, inspection: InspectionInput) {
  state = {
    ...state,
    inspections: state.inspections.map((existing) =>
      existing.id === id ? { ...existing, ...inspection } : existing,
    ),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("mii_inspections")
    .update(toInspectionRow(inspection))
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update inspection", error));
}

export function removeInspection(id: string) {
  const inspection = state.inspections.find((i) => i.id === id);
  state = { ...state, inspections: state.inspections.filter((i) => i.id !== id) };
  persist();
  emit();
  if (inspection) removeInspectionDocuments(inspection.documents);
  if (!isSavedId(id)) return;
  void supabase
    .from("mii_inspections")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove inspection", error));
}

export function addMiiJob(input: MiiJobInput) {
  const job = { ...input, poAmount: poAmountFor(input.amount, input.currency) };
  const tempId = uid();
  state = { ...state, miiJobs: [{ id: tempId, ...job }, ...state.miiJobs] };
  persist();
  emit();
  void (async () => {
    const { data, error } = await supabase
      .from("mii_job_number")
      .insert(toMiiJobRow(job))
      .select("id")
      .single();
    if (error) return reportError("Add job", error);
    state = {
      ...state,
      miiJobs: state.miiJobs.map((j) => (j.id === tempId ? { ...j, id: String(data.id) } : j)),
    };
    persist();
    emit();
  })();
}

export function updateMiiJob(id: string, input: MiiJobInput) {
  const job = { ...input, poAmount: poAmountFor(input.amount, input.currency) };
  state = {
    ...state,
    miiJobs: state.miiJobs.map((existing) => (existing.id === id ? { ...existing, ...job } : existing)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("mii_job_number")
    .update(toMiiJobRow(job))
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update job", error));
}

export function removeMiiJob(id: string) {
  state = { ...state, miiJobs: state.miiJobs.filter((j) => j.id !== id) };
  persist();
  emit();
  if (!isSavedId(id)) return;
  void supabase
    .from("mii_job_number")
    .delete()
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Remove job", error));
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

export function updateMachineHour(id: string, patch: Partial<Omit<MachineHour, "id">>) {
  state = {
    ...state,
    machineHours: state.machineHours.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  };
  persist();
  emit();
  if (!isSavedId(id)) return;
  const dbPatch: TablesUpdate<"machine_hours"> = {};
  if (patch.machineId !== undefined) dbPatch["machine_id"] = patch.machineId ? toDbId(patch.machineId) : null;
  if (patch.operatorId !== undefined) dbPatch["operator_id"] = patch.operatorId ? toDbId(patch.operatorId) : null;
  if (patch.workDate !== undefined) dbPatch["work_date"] = patch.workDate;
  if (patch.hours !== undefined) dbPatch["hours"] = patch.hours;
  if (patch.jobNumber !== undefined) dbPatch["job_number"] = patch.jobNumber || null;
  if (patch.notes !== undefined) dbPatch["notes"] = patch.notes || null;
  if (Object.keys(dbPatch).length === 0) return;
  void supabase
    .from("machine_hours")
    .update(dbPatch)
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update machine hours", error));
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

export function updateOrder(id: string, patch: Partial<Omit<ToolOrder, "id" | "itemId">>) {
  const existing = state.orders.find((o) => o.id === id);
  state = {
    ...state,
    orders: state.orders.map((order) => (order.id === id ? { ...order, ...patch } : order)),
  };
  if (existing && patch.qtyOrdered !== undefined) {
    bumpItem(existing.itemId, { ordered: patch.qtyOrdered - existing.qtyOrdered });
  }
  persist();
  emit();
  if (!isSavedId(id)) return;
  const dbPatch: TablesUpdate<"inventory_orders"> = {};
  if (patch.purchaseDate !== undefined) dbPatch["purchase_date"] = patch.purchaseDate || null;
  if (patch.brandId !== undefined) dbPatch["brand_id"] = patch.brandId ? toDbId(patch.brandId) : null;
  if (patch.qtyOrdered !== undefined) dbPatch["qty_ordered"] = patch.qtyOrdered;
  if (patch.amount !== undefined) dbPatch["amount"] = patch.amount;
  if (patch.documentName !== undefined) dbPatch["document_name"] = patch.documentName || null;
  if (patch.confirmed !== undefined) dbPatch["confirmed"] = patch.confirmed;
  if (Object.keys(dbPatch).length === 0) return;
  void supabase
    .from("inventory_orders")
    .update(dbPatch)
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update order", error));
}

export function updateAssignment(
  id: string,
  patch: Partial<Omit<ToolAssignment, "id" | "itemId">>,
) {
  const existing = state.assignments.find((a) => a.id === id);
  state = {
    ...state,
    assignments: state.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  };
  if (existing && patch.qtyIssued !== undefined) {
    bumpItem(existing.itemId, { issued: patch.qtyIssued - existing.qtyIssued });
  }
  persist();
  emit();
  if (!isSavedId(id)) return;
  const dbPatch: TablesUpdate<"inventory_assigned"> = {};
  if (patch.userId !== undefined) dbPatch["user_id"] = patch.userId ? toDbId(patch.userId) : null;
  if (patch.issuedDate !== undefined) dbPatch["issued_date"] = patch.issuedDate || null;
  if (patch.qtyIssued !== undefined) dbPatch["qty_issued"] = patch.qtyIssued;
  if (patch.brandId !== undefined) dbPatch["brand_id"] = patch.brandId ? toDbId(patch.brandId) : null;
  if (patch.remarks !== undefined) dbPatch["remarks"] = patch.remarks || null;
  if (patch.jobNumber !== undefined) dbPatch["job_number"] = patch.jobNumber || null;
  if (patch.drawingNumber !== undefined) dbPatch["drawing_number"] = patch.drawingNumber || null;
  if (patch.location !== undefined) dbPatch["source_location"] = patch.location || null;
  if (patch.machineId !== undefined) dbPatch["machine_id"] = patch.machineId ? toDbId(patch.machineId) : null;
  if (Object.keys(dbPatch).length === 0) return;
  void supabase
    .from("inventory_assigned")
    .update(dbPatch)
    .eq("id", toDbId(id))
    .then(({ error }) => error && reportError("Update assignment", error));
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

// ── Rules carried over from the old system ─────────────────────────────────

/**
 * A drawing's status follows its toggles and quantities: switching Completed on, or
 * completing every piece, makes it Completed; a fully made drawing that is shipped
 * becomes Shipped (with today's date if none is set).
 */
function applyDrawingRules(input: MiiOrderDetailInput): MiiOrderDetailInput {
  const detail = { ...input };
  const allMade = detail.quantity > 0 && detail.quantityCompleted === detail.quantity;
  if (detail.completed || allMade) detail.orderStatus = "Completed";
  if (allMade && detail.shipment) {
    detail.orderStatus = "Shipped";
    if (!detail.shipmentDate) detail.shipmentDate = todayDate();
  }
  return detail;
}

const jobInput = ({ id: _id, ...job }: Job): JobInput => job;

/**
 * A job follows its drawings: all Completed -> Completed; some Completed -> Partially
 * Completed; all Shipped -> Shipped (ship date today if none); all In Progress, Not
 * Started, Mistake or Requires Attention -> that status; any other mix leaves the status
 * as it is. The item counts come from the drawings too.
 */
function syncJobFromDrawings(jobId: string) {
  const job = state.jobs.find((j) => j.id === jobId);
  if (!job) return;
  const drawings = state.miiOrderDetails.filter((d) => d.jobId === jobId);
  const total = drawings.length;
  if (total === 0) return;
  const count = (status: MiiOrderStatus) => drawings.filter((d) => d.orderStatus === status).length;
  const all = (status: MiiOrderStatus) => count(status) === total;

  let status = job.status;
  let completedItems = 0;
  let shipDate = job.shipDate;
  if (all("Completed")) {
    status = "Completed";
    completedItems = total;
  } else if (count("Completed") > 0) {
    status = "Partially Completed";
    completedItems = count("Completed");
  } else if (all("Shipped")) {
    status = "Shipped";
    completedItems = total;
    shipDate = shipDate || todayDate();
  } else if (all("In Progress")) status = "In Progress";
  else if (all("Not Started")) status = "Not Started";
  else if (all("Mistake")) status = "Mistake";
  else if (all("Requires Attention")) status = "Requires Attention";

  if (
    status === job.status &&
    completedItems === job.completedItems &&
    total === job.numberOfItems &&
    shipDate === job.shipDate
  ) {
    return;
  }
  updateJob(jobId, { ...jobInput(job), status, completedItems, numberOfItems: total, shipDate });
}

/**
 * Logging machining hours starts the work: the drawing it is for and its job both
 * switch to In Progress.
 */
function markWorkStarted(entry: MachiningHourInput) {
  if (entry.jobId && entry.drawingNumber) {
    for (const detail of state.miiOrderDetails) {
      if (detail.jobId !== entry.jobId || detail.drawingNumber !== entry.drawingNumber) continue;
      if (detail.orderStatus === "In Progress") continue;
      const { id, ...input } = detail;
      updateMiiOrderDetail(id, { ...input, orderStatus: "In Progress" }, false);
    }
  }
  const job = entry.jobId ? state.jobs.find((j) => j.id === entry.jobId) : undefined;
  if (job && job.status !== "In Progress") {
    updateJob(job.id, { ...jobInput(job), status: "In Progress" });
  }
}

export const balanceOf = (i: InventoryItem) => i.ordered - i.issued;
export const isLow = (i: InventoryItem) => balanceOf(i) <= i.threshold;
