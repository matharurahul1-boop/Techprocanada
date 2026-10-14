import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Shell } from "@/components/Shell";
import { DataList } from "@/components/DataList";
import { useConfirmDelete } from "@/components/confirm-delete";
import { FilterBanner, searchText } from "@/components/drill-down";
import { InspectionSheet, MachiningHourSheet, OrderDetailSheet } from "@/components/job-sheets";
import {
  getInspectionDocumentUrl,
  removeInspection,
  removeMachiningHour,
  removeMiiOrderDetail,
  useStore,
  type Inspection,
  type MachiningHour,
  type MiiOrderDetail,
} from "@/lib/store";
import { JOB_STATUS_COLOR, ORDER_STATUS_COLOR } from "@/lib/order-status";
import {
  daysLeft,
  fileName,
  formatDate,
  formatDuration,
  formatSubmitted,
} from "@/lib/job-format";

const PAGE_SIZE = 20;

const TABS = [
  { key: "orders", label: "Order details" },
  { key: "inspections", label: "Inspections" },
  { key: "machining", label: "Machining hours" },
] as const;

type Tab = (typeof TABS)[number]["key"];

// The add / edit form that is open over the page, if any.
type OpenSheet =
  | { kind: "order"; editId: string | null }
  | { kind: "inspection"; editId: string | null; drawingDetailId?: string | undefined }
  | { kind: "machining"; editId: string | null; drawingNumber?: string | undefined };

const actionClass =
  "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition";

export const Route = createFileRoute("/job_/$jobId")({
  // ?tab picks the sub-table; ?drawing=<order details id> narrows Inspections and
  // Machining hours to one drawing; ?page is the list page.
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: Tab | undefined; drawing?: string | undefined; page?: number | undefined } => ({
    tab: TABS.find((tab) => tab.key === search["tab"])?.key,
    drawing: searchText(search["drawing"]),
    page: typeof search["page"] === "number" && search["page"] > 1 ? search["page"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Job details — TechPro Inventory Console" },
      {
        name: "description",
        content: "One job with its order details, inspections and machining hours.",
      },
    ],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const { tab = "orders", drawing: drawingFilter, page = 1 } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const { jobs, companies, miiOrderDetails, inspections, machiningHours, users, machines } =
    useStore();

  const job = jobs.find((j) => j.id === jobId);

  const details = miiOrderDetails.filter((d) => d.jobId === jobId);
  const detailById = (id: string) => details.find((d) => d.id === id);
  const filterDetail = drawingFilter ? detailById(drawingFilter) : undefined;

  // An inspection's job and drawing are both MII order details rows.
  const jobInspections = inspections.filter(
    (i) => detailById(i.jobDetailId) ?? detailById(i.drawingDetailId),
  );
  const jobMachining = machiningHours.filter((entry) => entry.jobId === jobId);

  const inspectionsFor = (detail: MiiOrderDetail) =>
    jobInspections.filter((i) => i.drawingDetailId === detail.id);
  // Machining Hours stores the drawing as text, so it is matched by drawing number.
  const machiningFor = (detail: MiiOrderDetail) =>
    jobMachining.filter(
      (entry) => detail.drawingNumber && entry.drawingNumber === detail.drawingNumber,
    );

  const shownInspections = filterDetail ? inspectionsFor(filterDetail) : jobInspections;
  const shownMachining = filterDetail ? machiningFor(filterDetail) : jobMachining;
  const counts: Record<Tab, number> = {
    orders: details.length,
    inspections: shownInspections.length,
    machining: shownMachining.length,
  };

  const drawingNumber = (i: Inspection) => detailById(i.drawingDetailId)?.drawingNumber || "—";
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? "—";

  const show = (next: { tab: Tab; drawing?: string | undefined }) =>
    navigate({ search: { tab: next.tab, drawing: next.drawing } });
  const setPage = (next: number) =>
    navigate({ search: (prev) => ({ ...prev, page: next > 1 ? next : undefined }), replace: true });
  const pagination = (itemLabel: string) => ({
    page,
    onPageChange: setPage,
    pageSize: PAGE_SIZE,
    itemLabel,
  });

  const openDocument = async (path: string) => {
    // Open the tab synchronously so the browser doesn't treat it as a popup.
    const tab = window.open("", "_blank");
    const url = await getInspectionDocumentUrl(path);
    if (url && tab) tab.location.href = url;
    else tab?.close();
  };

  if (!job) {
    return (
      <Shell eyebrow="Job · Job details" title="Job details">
        <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
          <div className="glass-surface rounded-2xl border p-6 text-center">
            <p className="text-sm text-muted-fg">
              This job could not be found. It may still be loading, or it was removed.
            </p>
            <Link
              to="/job"
              className={`${actionClass} mt-4 bg-chip text-ink hover:bg-accent-brand hover:text-accent-brand-ink`}
            >
              <ArrowLeft size={14} /> Back to jobs
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const days = daysLeft(job.date, job.dueDate);
  const drawingText = filterDetail?.drawingNumber || undefined;

  // A count that jumps to another tab narrowed to one drawing.
  const countLink = (count: number, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${count} ${label}`}
      title={`Show ${label}`}
      className={`inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2.5 font-mono text-[12px] font-semibold transition hover:bg-accent-brand hover:text-accent-brand-ink ${count === 0 ? "bg-chip/50 text-muted-fg" : "bg-chip text-ink"}`}
    >
      {count}
    </button>
  );

  const fact = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <p className="text-[10px] font-bold tracking-[0.14em] text-muted-fg uppercase">{label}</p>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );

  const mono = (value: string) => (
    <span className="font-mono text-[12px] text-muted-fg">{value || "—"}</span>
  );

  const orderStatusPill = (detail: MiiOrderDetail) => (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ORDER_STATUS_COLOR[detail.orderStatus]}`}
    >
      {detail.orderStatus}
    </span>
  );

  const documentLinks = (inspection: Inspection) => (
    <div className="flex flex-wrap gap-1.5">
      {inspection.documents.map((path) => (
        <button
          key={path}
          type="button"
          onClick={() => openDocument(path)}
          className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full bg-chip px-2.5 py-1 text-[12px] text-accent-brand transition hover:bg-accent-brand hover:text-accent-brand-ink"
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{fileName(path)}</span>
        </button>
      ))}
    </div>
  );

  const rowButtons = (label: string, onEdit: () => void, onRemove: () => void) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <button
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
  const orderButtons = (d: MiiOrderDetail) =>
    rowButtons(
      `drawing ${d.drawingNumber}`,
      () => setSheet({ kind: "order", editId: d.id }),
      () =>
        confirmDelete({
          title: `Delete drawing ${d.drawingNumber || "(no number)"}?`,
          description: "Inspections recorded against it are kept but lose their drawing.",
          onConfirm: () => removeMiiOrderDetail(d.id),
        }),
    );
  const inspectionButtons = (i: Inspection) =>
    rowButtons(
      "inspection",
      () => setSheet({ kind: "inspection", editId: i.id }),
      () =>
        confirmDelete({
          title: "Delete this inspection?",
          description: "Its supporting documents will be deleted too.",
          onConfirm: () => removeInspection(i.id),
        }),
    );
  const machiningButtons = (entry: MachiningHour) =>
    rowButtons(
      "machining entry",
      () => setSheet({ kind: "machining", editId: entry.id }),
      () =>
        confirmDelete({
          title: "Delete this machining entry?",
          description: "This cannot be undone.",
          onConfirm: () => removeMachiningHour(entry.id),
        }),
    );

  // Add button and full-table link for the open tab.
  const addClass = `${actionClass} brand-gradient text-accent-brand-ink shadow-lg shadow-accent-brand/20 hover:brightness-110`;
  const fullClass = `${actionClass} bg-chip text-ink hover:bg-accent-brand hover:text-accent-brand-ink`;
  const tabActions: Record<Tab, ReactNode> = {
    orders: (
      <>
        <Link to="/mii-order-details" search={{ job: jobId }} className={fullClass}>
          <ExternalLink size={14} /> Full table
        </Link>
        <button
          type="button"
          onClick={() => setSheet({ kind: "order", editId: null })}
          className={addClass}
        >
          <Plus size={14} /> Add drawing
        </button>
      </>
    ),
    inspections: (
      <>
        <Link
          to="/inspections"
          search={filterDetail ? { drawing: filterDetail.id } : { job: jobId }}
          className={fullClass}
        >
          <ExternalLink size={14} /> Full table
        </Link>
        <button
          type="button"
          onClick={() => setSheet({ kind: "inspection", editId: null })}
          className={addClass}
        >
          <Plus size={14} /> Add inspection
        </button>
      </>
    ),
    machining: (
      <>
        <Link
          to="/machining-hours"
          search={{ job: jobId, drawing: drawingText }}
          className={fullClass}
        >
          <ExternalLink size={14} /> Full table
        </Link>
        <button
          type="button"
          onClick={() => setSheet({ kind: "machining", editId: null })}
          className={addClass}
        >
          <Plus size={14} /> Add entry
        </button>
      </>
    ),
  };

  const emptyRow = (text: string) => (
    <p className="px-4 py-8 text-center text-sm text-muted-fg">{text}</p>
  );

  return (
    <Shell eyebrow="Job · Job details" title={`Job ${job.jobNumber || "(no job number)"}`}>
      <div className="animate-rise space-y-5 px-5 py-6 lg:px-8 lg:py-8">
        <Link
          to="/job"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-fg transition hover:text-ink"
        >
          <ArrowLeft size={14} /> All jobs
        </Link>

        <section className="glass-surface rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">
                {`Job ${job.jobNumber || "—"}`}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-muted-fg">
                {companies.find((c) => c.id === job.companyId)?.name ?? "No company"}
              </p>
            </div>
            <span
              className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${JOB_STATUS_COLOR[job.status]}`}
            >
              {job.status}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {fact("Job number", <span className="font-mono">{job.jobNumber || "—"}</span>)}
            {fact("PO number", <span className="font-mono">{job.poNumber || "—"}</span>)}
            {fact("Date", <span className="font-mono">{formatDate(job.date)}</span>)}
            {fact(
              "Due date",
              <span className="font-mono">
                {formatDate(job.dueDate)}
                {days !== null && (
                  <span className={`ml-2 ${days >= 0 ? "text-good" : "text-destructive"}`}>
                    {days >= 0 ? `${days} left` : `${-days} behind`}
                  </span>
                )}
              </span>,
            )}
            {fact(
              "Items completed / No. of items",
              <span className="font-mono">
                {job.completedItems}/{job.numberOfItems}
              </span>,
            )}
            {fact("Ship date", <span className="font-mono">{formatDate(job.shipDate)}</span>)}
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
            <div role="tablist" aria-label="Job tables" className="flex flex-wrap gap-1.5">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => show({ tab: key, drawing: drawingFilter })}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${
                    tab === key
                      ? "bg-accent-brand text-accent-brand-ink ring-accent-brand"
                      : "bg-panel text-muted-fg ring-line hover:text-ink"
                  }`}
                >
                  {label}
                  <span className="font-mono text-[11px] opacity-80">{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">{tabActions[tab]}</div>
          </div>

          {filterDetail && tab !== "orders" && (
            <FilterBanner
              label={`Drawing ${filterDetail.drawingNumber || "—"}`}
              onClear={() => show({ tab })}
            />
          )}

          {tab === "orders" && (
            <DataList<MiiOrderDetail>
              rows={details}
              pagination={pagination("drawings")}
              rowKey={(d) => d.id}
              minWidth="69rem"
              empty={emptyRow("No drawings on this job yet.")}
              columns={[
                {
                  header: "Drawing number",
                  width: "8rem",
                  sortValue: (d) => d.drawingNumber,
                  cell: (d) => (
                    <p className="truncate font-mono text-[12px] font-semibold">
                      {d.drawingNumber || "—"}
                    </p>
                  ),
                },
                {
                  header: "Drawing name",
                  width: "minmax(9rem,1fr)",
                  sortValue: (d) => d.drawingName,
                  cell: (d) => <p className="truncate text-sm">{d.drawingName || "—"}</p>,
                },
                {
                  header: "Qty done",
                  width: "5.5rem",
                  align: "right",
                  sortValue: (d) => d.quantityCompleted,
                  cell: (d) => (
                    <span className="font-mono text-[13px]">
                      <span className="font-semibold">{d.quantityCompleted}</span>/{d.quantity}
                    </span>
                  ),
                },
                {
                  header: "Order status",
                  width: "9.5rem",
                  sortValue: (d) => d.orderStatus,
                  cell: orderStatusPill,
                },
                {
                  header: "Quoted",
                  width: "5rem",
                  align: "right",
                  sortValue: (d) => d.quotedMinutes ?? "",
                  cell: (d) => (
                    <span className="font-mono text-[12px]">{formatDuration(d.quotedMinutes)}</span>
                  ),
                },
                {
                  header: "Actual",
                  width: "5rem",
                  align: "right",
                  sortValue: (d) => d.actualMinutes ?? "",
                  cell: (d) => (
                    <span className="font-mono text-[12px]">{formatDuration(d.actualMinutes)}</span>
                  ),
                },
                {
                  header: "Inspections",
                  width: "6rem",
                  align: "center",
                  sortValue: (d) => inspectionsFor(d).length,
                  cell: (d) =>
                    countLink(inspectionsFor(d).length, "inspections", () =>
                      show({ tab: "inspections", drawing: d.id }),
                    ),
                },
                {
                  header: "Machining",
                  width: "6rem",
                  align: "center",
                  sortValue: (d) => machiningFor(d).length,
                  cell: (d) =>
                    countLink(machiningFor(d).length, "machining entries", () =>
                      show({ tab: "machining", drawing: d.id }),
                    ),
                },
                { header: "Action", width: "5rem", align: "right", cell: orderButtons },
              ]}
              card={(d) => (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {d.drawingName || d.drawingNumber || "Untitled drawing"}
                      </p>
                      <p className="truncate font-mono text-[12px] text-muted-fg">
                        Dwg {d.drawingNumber || "—"} · Qty {d.quantityCompleted}/{d.quantity}
                      </p>
                    </div>
                    {orderStatusPill(d)}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium text-muted-fg">
                    <span className="flex items-center gap-2">
                      Inspections
                      {countLink(inspectionsFor(d).length, "inspections", () =>
                        show({ tab: "inspections", drawing: d.id }),
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      Machining
                      {countLink(machiningFor(d).length, "machining entries", () =>
                        show({ tab: "machining", drawing: d.id }),
                      )}
                    </span>
                    <span className="ml-auto">{orderButtons(d)}</span>
                  </div>
                </>
              )}
            />
          )}

          {tab === "inspections" && (
            <DataList<Inspection>
              rows={shownInspections}
              pagination={pagination("submissions")}
              rowKey={(i) => i.id}
              empty={emptyRow(
                filterDetail ? "No inspections for this drawing yet." : "No inspections yet.",
              )}
              columns={[
                {
                  header: "Drawing number",
                  width: "8rem",
                  sortValue: (i) => drawingNumber(i),
                  cell: (i) => (
                    <span className="font-mono text-[12px] font-semibold">{drawingNumber(i)}</span>
                  ),
                },
                {
                  header: "Supporting documents",
                  width: "minmax(0,1fr)",
                  sortValue: (i) => i.documents.length,
                  cell: documentLinks,
                },
                {
                  header: "Submitted at",
                  width: "11rem",
                  sortValue: (i) => i.createdAt ?? "",
                  cell: (i) => mono(formatSubmitted(i.createdAt)),
                },
                { header: "Action", width: "5rem", align: "right", cell: inspectionButtons },
              ]}
              card={(i) => (
                <>
                  <p className="mb-2 truncate font-mono text-[12px] text-muted-fg">
                    Dwg <span className="text-ink">{drawingNumber(i)}</span> · Submitted{" "}
                    {formatSubmitted(i.createdAt)}
                  </p>
                  <div className="flex items-end justify-between gap-3">
                    {documentLinks(i)}
                    {inspectionButtons(i)}
                  </div>
                </>
              )}
            />
          )}

          {tab === "machining" && (
            <DataList<MachiningHour>
              rows={shownMachining}
              pagination={pagination("entries")}
              rowKey={(entry) => entry.id}
              empty={emptyRow(
                filterDetail
                  ? "No machining entries for this drawing yet."
                  : "No machining entries yet.",
              )}
              columns={[
                {
                  header: "Date",
                  width: "7rem",
                  sortValue: (entry) => entry.date,
                  cell: (entry) => mono(formatDate(entry.date)),
                },
                {
                  header: "User",
                  width: "minmax(8rem,0.8fr)",
                  sortValue: (entry) => userName(entry.userId),
                  cell: (entry) => (
                    <p className="truncate text-sm font-semibold">{userName(entry.userId)}</p>
                  ),
                },
                {
                  header: "Machine",
                  width: "minmax(8rem,0.8fr)",
                  sortValue: (entry) => machineName(entry.machineId),
                  cell: (entry) => (
                    <p className="truncate text-[13px]">{machineName(entry.machineId)}</p>
                  ),
                },
                {
                  header: "Description",
                  width: "minmax(10rem,1.5fr)",
                  cell: (entry) => (
                    <p className="line-clamp-2 text-[13px] text-muted-fg">
                      {entry.description || "—"}
                    </p>
                  ),
                },
                {
                  header: "Drawing number",
                  width: "8rem",
                  sortValue: (entry) => entry.drawingNumber,
                  cell: (entry) => mono(entry.drawingNumber),
                },
                {
                  header: "Hours",
                  width: "5rem",
                  align: "right",
                  sortValue: (entry) => entry.durationMinutes ?? "",
                  cell: (entry) => (
                    <span className="font-mono text-[12px] font-semibold">
                      {formatDuration(entry.durationMinutes)}
                    </span>
                  ),
                },
                { header: "Action", width: "5rem", align: "right", cell: machiningButtons },
              ]}
              card={(entry) => (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{userName(entry.userId)}</p>
                      <p className="truncate text-[12px] text-muted-fg">
                        {machineName(entry.machineId)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-fg">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                  {entry.description && <p className="mt-1.5 text-[13px]">{entry.description}</p>}
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] text-muted-fg">
                      {entry.drawingNumber ? `Dwg ${entry.drawingNumber}` : ""}
                      {entry.durationMinutes !== null
                        ? ` · ${formatDuration(entry.durationMinutes)} h`
                        : ""}
                    </p>
                    {machiningButtons(entry)}
                  </div>
                </>
              )}
            />
          )}
        </section>
      </div>

      {/* Saving a new drawing moves on to its inspection, and a new inspection to its
          machining hours, each with the job and drawing already selected. */}
      <OrderDetailSheet
        open={sheet?.kind === "order"}
        editing={(sheet?.kind === "order" && sheet.editId && detailById(sheet.editId)) || null}
        defaultJobId={jobId}
        onClose={() => setSheet(null)}
        onAdded={(id) => {
          show({ tab: "inspections", drawing: id });
          setSheet({ kind: "inspection", editId: null, drawingDetailId: id });
        }}
      />
      <InspectionSheet
        open={sheet?.kind === "inspection"}
        editing={
          (sheet?.kind === "inspection" && jobInspections.find((i) => i.id === sheet.editId)) ||
          null
        }
        defaults={{
          jobId,
          drawingDetailId:
            (sheet?.kind === "inspection" && sheet.drawingDetailId) || filterDetail?.id,
        }}
        onClose={() => setSheet(null)}
        onAdded={({ drawingDetailId, drawingNumber }) => {
          show({ tab: "machining", drawing: drawingDetailId || undefined });
          setSheet({ kind: "machining", editId: null, drawingNumber });
        }}
      />
      <MachiningHourSheet
        open={sheet?.kind === "machining"}
        editing={
          (sheet?.kind === "machining" && jobMachining.find((e) => e.id === sheet.editId)) || null
        }
        defaults={{
          jobId,
          drawingNumber: (sheet?.kind === "machining" && sheet.drawingNumber) || drawingText,
        }}
        onClose={() => setSheet(null)}
      />
      {confirmDialog}
    </Shell>
  );
}
