import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileCheck2, Pencil, Timer, Trash2 } from "lucide-react";

import { Shell } from "@/components/Shell";
import { ImportError, TableTransfer } from "@/components/table-transfer";
import { cellBool, cellDate, cellNumber, cellOption } from "@/lib/excel";
import { useConfirmDelete } from "@/components/confirm-delete";
import { AddButton } from "@/components/Sheet";
import { DataList } from "@/components/DataList";
import { FilterBanner, searchFlag, searchText, useOpenOnAdd } from "@/components/drill-down";
import { OrderDetailSheet } from "@/components/job-sheets";
import { JobWheel } from "@/components/job-wheel";
import { Switch } from "@/components/ui/switch";
import {
  MII_ORDER_STATUSES,
  removeMiiOrderDetail,
  updateMiiOrderDetail,
  useStore,
  type MiiOrderDetail,
  type MiiOrderDetailInput,
  addMiiOrderDetail,
} from "@/lib/store";
import { ORDER_STATUS_COLOR as STATUS_COLOR } from "@/lib/order-status";
import {
  formatDate,
  formatDuration,
  formatVariance,
  parseDuration,
  today,
  varianceOf,
  varianceTone,
} from "@/lib/job-format";

const PAGE_SIZE = 20;

const toInput = ({ id: _id, ...detail }: MiiOrderDetail): MiiOrderDetailInput => detail;

export const Route = createFileRoute("/mii-order-details")({
  // ?job=<job id> shows only that job's drawings (opened from the Job table);
  // ?add opens the new-drawing form straight away (after a job was added).
  validateSearch: (
    search: Record<string, unknown>,
  ): { job?: string | undefined; add?: boolean | undefined } => ({
    job: searchText(search["job"]),
    add: searchFlag(search["add"]),
  }),
  head: () => ({
    meta: [
      { title: "MII Order Details — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Track drawings per job: quantities, order status, inspection, shipment and quoted vs actual hours.",
      },
      { property: "og:title", content: "MII Order Details — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track MII order drawings and hours in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiiOrderDetailsPage,
});

function MiiOrderDetailsPage() {
  const { miiOrderDetails, jobs, inspections, machiningHours } = useStore();
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { job: jobFilter, add } = Route.useSearch();
  const navigate = Route.useNavigate();

  const jobNumber = (id: string) => jobs.find((j) => j.id === id)?.jobNumber || "—";
  const rows = jobFilter ? miiOrderDetails.filter((d) => d.jobId === jobFilter) : miiOrderDetails;

  const openNew = () => {
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (detail: MiiOrderDetail) => {
    setEditId(detail.id);
    setOpen(true);
  };

  useOpenOnAdd(add, openNew, () =>
    navigate({ search: (prev) => ({ ...prev, add: undefined }), replace: true }),
  );

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
  };

  const toggleInRow = (detail: MiiOrderDetail, field: "completed" | "inspected" | "shipment") => (
    <Switch
      checked={detail[field]}
      onCheckedChange={(checked) => {
        const next = { ...toInput(detail), [field]: checked };
        if (checked && field === "completed" && !next.completedDate) next.completedDate = today();
        if (checked && field === "shipment" && !next.shipmentDate) next.shipmentDate = today();
        updateMiiOrderDetail(detail.id, next);
      }}
      aria-label={`${field} for drawing ${detail.drawingNumber || detail.id}`}
    />
  );

  const statusPill = (detail: MiiOrderDetail) => (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[detail.orderStatus]}`}
    >
      {detail.orderStatus}
    </span>
  );

  // Wheel menu: the drawing in the hub with its inspections and machining hours around
  // it; each opens the job details page on that tab, narrowed to this drawing.
  const wheel = (detail: MiiOrderDetail) => (
    <JobWheel
      jobId={detail.jobId}
      hubLabel="Drawing"
      hubText={detail.drawingNumber}
      triggerLabel={`Open tables for drawing ${detail.drawingNumber}`}
      spokes={[
        {
          tab: "inspections",
          label: "Inspections",
          short: "Inspections",
          icon: FileCheck2,
          drawing: detail.id,
          count: inspections.filter((i) => i.drawingDetailId === detail.id).length,
        },
        {
          tab: "machining",
          label: "Machining hours",
          short: "Machining",
          icon: Timer,
          drawing: detail.id,
          // Machining Hours stores the drawing as text, so it is matched by number.
          count: machiningHours.filter(
            (entry) =>
              entry.jobId === detail.jobId &&
              detail.drawingNumber !== "" &&
              entry.drawingNumber === detail.drawingNumber,
          ).length,
        },
      ]}
    />
  );

  const rowActions = (detail: MiiOrderDetail) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      {wheel(detail)}
      <button
        onClick={() => openEdit(detail)}
        aria-label={`Edit drawing ${detail.drawingNumber}`}
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() =>
          confirmDelete({
            title: `Delete drawing ${detail.drawingNumber || "(no number)"}?`,
            description: "Inspections recorded against it are kept but lose their drawing.",
            onConfirm: () => removeMiiOrderDetail(detail.id),
          })
        }
        aria-label={`Remove drawing ${detail.drawingNumber}`}
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const mono = (value: string) => (
    <span className="font-mono text-[12px] text-muted-fg">{value || "—"}</span>
  );

  const hoursText = (minutes: number | null) => (minutes === null ? "" : formatDuration(minutes));
  const yesNo = (value: boolean) => (value ? "Yes" : "No");
  const transfer = (
    <TableTransfer
      name="mii-order-details"
      label="drawings"
      rows={rows}
      columns={[
        { header: "Job number", value: (d) => jobs.find((j) => j.id === d.jobId)?.jobNumber ?? "" },
        { header: "Drawing number", value: (d) => d.drawingNumber },
        { header: "Drawing name", value: (d) => d.drawingName, width: 30 },
        { header: "Quantity", value: (d) => d.quantity, width: 10 },
        { header: "Quantity completed", value: (d) => d.quantityCompleted },
        { header: "Order status", value: (d) => d.orderStatus },
        { header: "Completed", value: (d) => yesNo(d.completed), width: 11 },
        { header: "Completed date", value: (d) => d.completedDate },
        { header: "Inspected", value: (d) => yesNo(d.inspected), width: 11 },
        { header: "Shipment", value: (d) => yesNo(d.shipment), width: 11 },
        { header: "Shipment date", value: (d) => d.shipmentDate },
        { header: "Remarks", value: (d) => d.remarks, width: 36 },
        { header: "Quoted hours", value: (d) => hoursText(d.quotedMinutes) },
        { header: "Actual hours", value: (d) => hoursText(d.actualMinutes) },
      ]}
      parse={({ get }): MiiOrderDetailInput => {
        const drawingNumber = get("Drawing number");
        if (!drawingNumber) throw new ImportError("no drawing number");
        const jobText = get("Job number");
        const job = jobs.find((j) => j.jobNumber.toLowerCase() === jobText.toLowerCase());
        if (jobText && !job) throw new ImportError('unknown job number "' + jobText + '"');
        const quantity = cellNumber(get("Quantity"));
        const quantityCompleted = cellNumber(get("Quantity completed"));
        if (quantity === null || quantityCompleted === null) {
          throw new ImportError("quantity is not a number");
        }
        const completedDate = cellDate(get("Completed date"));
        const shipmentDate = cellDate(get("Shipment date"));
        if (completedDate === null || shipmentDate === null) {
          throw new ImportError("a date is not in YYYY-MM-DD or DD/MM/YYYY form");
        }
        const statusText = get("Order status");
        const orderStatus = statusText ? cellOption(statusText, MII_ORDER_STATUSES) : "Not Started";
        if (!orderStatus) throw new ImportError('unknown order status "' + statusText + '"');
        const quotedMinutes = parseDuration(get("Quoted hours"));
        const actualMinutes = parseDuration(get("Actual hours"));
        if (Number.isNaN(quotedMinutes) || Number.isNaN(actualMinutes)) {
          throw new ImportError("hours must be h:mm or decimal hours");
        }
        return {
          jobId: job?.id ?? "",
          drawingNumber,
          drawingName: get("Drawing name"),
          quantity,
          quantityCompleted,
          orderStatus,
          completed: cellBool(get("Completed")),
          completedDate,
          inspected: cellBool(get("Inspected")),
          shipment: cellBool(get("Shipment")),
          shipmentDate,
          remarks: get("Remarks"),
          quotedMinutes,
          actualMinutes,
        };
      }}
      add={addMiiOrderDetail}
    />
  );

  return (
    <Shell
      eyebrow="Job · MII Order Details"
      title="MII Order Details"
      action={<AddButton label="Add drawing" onClick={openNew} />}
    >
      {/* After a new drawing is saved, the next step is adding its inspection. */}
      <OrderDetailSheet
        open={open}
        editing={miiOrderDetails.find((d) => d.id === editId) ?? null}
        defaultJobId={jobFilter}
        onClose={closeSheet}
        onAdded={(id) => navigate({ to: "/inspections", search: { drawing: id, add: true } })}
      />

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Order drawings</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">{rows.length} drawings</span>
            </div>
          </div>

          {jobFilter && (
            <FilterBanner
              label={`Job ${jobNumber(jobFilter)}`}
              onClear={() => navigate({ search: {} })}
            />
          )}

          <DataList
            rows={rows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "drawings" }}
            rowKey={(detail) => detail.id}
            breakpoint="xl"
            minWidth="72rem"
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No drawings yet. Add your first one.
              </p>
            }
            columns={[
              {
                header: "Job number",
                width: "minmax(5rem,5fr)",
                sortValue: (d) => jobNumber(d.jobId),
                cell: (d) => <span className="font-mono text-[12px]">{jobNumber(d.jobId)}</span>,
              },
              {
                // Drawing number on top, name below; sorts by number.
                header: "Drawing",
                width: "minmax(8rem,10fr)",
                sortValue: (d) => d.drawingNumber,
                cell: (d) => (
                  <div className="leading-tight">
                    <p className="truncate font-mono text-[12px] font-semibold">
                      {d.drawingNumber || "—"}
                    </p>
                    <p className="truncate text-[12px] text-muted-fg">{d.drawingName || "—"}</p>
                  </div>
                ),
              },
              {
                // Completed out of total; sorts by how many are still to do.
                header: "Qty",
                width: "minmax(4.5rem,4.5fr)",
                sortValue: (d) => d.quantity - d.quantityCompleted,
                cell: (d) => (
                  <span className="font-mono text-[13px]" title="Completed / total quantity">
                    <span className="font-semibold">{d.quantityCompleted}</span>
                    <span className="text-muted-fg"> / {d.quantity}</span>
                  </span>
                ),
              },
              {
                header: "Order status",
                width: "minmax(8rem,8fr)",
                sortValue: (d) => MII_ORDER_STATUSES.indexOf(d.orderStatus),
                cell: statusPill,
              },
              {
                // Switch with its date below; sorts by the date.
                header: "Completed",
                width: "minmax(5.5rem,5.5fr)",
                sortValue: (d) => d.completedDate,
                cell: (d) => (
                  <div className="flex flex-col items-start gap-1">
                    {toggleInRow(d, "completed")}
                    {d.completedDate && mono(formatDate(d.completedDate))}
                  </div>
                ),
              },
              {
                header: "Inspected",
                width: "minmax(4.5rem,4.5fr)",
                sortValue: (d) => (d.inspected ? 1 : 0),
                cell: (d) => toggleInRow(d, "inspected"),
              },
              {
                // Switch with its date below; sorts by the date.
                header: "Shipment",
                width: "minmax(5.5rem,5.5fr)",
                sortValue: (d) => d.shipmentDate,
                cell: (d) => (
                  <div className="flex flex-col items-start gap-1">
                    {toggleInRow(d, "shipment")}
                    {d.shipmentDate && mono(formatDate(d.shipmentDate))}
                  </div>
                ),
              },
              {
                header: "Remarks",
                width: "minmax(8rem,10fr)",
                cell: (d) => (
                  <p className="line-clamp-2 text-[12px] text-muted-fg">{d.remarks || "—"}</p>
                ),
              },
              {
                // Quoted → actual, with the variance below; sorts by variance.
                header: "Hours",
                width: "minmax(6.5rem,6.5fr)",
                sortValue: (d) => varianceOf(d.quotedMinutes, d.actualMinutes) ?? "",
                cell: (d) => {
                  const variance = varianceOf(d.quotedMinutes, d.actualMinutes);
                  return (
                    <div className="font-mono text-[12px] leading-tight">
                      <p title="Quoted → actual">
                        {formatDuration(d.quotedMinutes)} <span className="text-muted-fg">→</span>{" "}
                        {formatDuration(d.actualMinutes)}
                      </p>
                      <p
                        className={`font-semibold ${varianceTone(variance)}`}
                        title="Variance (actual − quoted)"
                      >
                        {formatVariance(variance)}
                      </p>
                    </div>
                  );
                },
              },
              { header: "Action", width: "7.5rem", align: "right", cell: rowActions },
            ]}
            card={(d) => {
              const variance = varianceOf(d.quotedMinutes, d.actualMinutes);
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {d.drawingName || d.drawingNumber || "Untitled drawing"}
                      </p>
                      <p className="truncate font-mono text-[12px] text-muted-fg">
                        Job {jobNumber(d.jobId)} · Dwg {d.drawingNumber || "—"}
                      </p>
                    </div>
                    {statusPill(d)}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-fg">
                    <span>
                      Qty <span className="text-ink">{d.quantityCompleted}</span>/{d.quantity}
                    </span>
                    <span>Quoted {formatDuration(d.quotedMinutes)}</span>
                    <span>Actual {formatDuration(d.actualMinutes)}</span>
                    <span className={`font-semibold ${varianceTone(variance)}`}>
                      Var {formatVariance(variance)}
                    </span>
                    {d.completedDate && <span>Done {formatDate(d.completedDate)}</span>}
                    {d.shipmentDate && <span>Ship {formatDate(d.shipmentDate)}</span>}
                  </div>

                  {d.remarks && <p className="mt-1.5 text-[12px] text-muted-fg">{d.remarks}</p>}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium text-muted-fg">
                      <label className="flex items-center gap-2">
                        {toggleInRow(d, "completed")} Completed
                      </label>
                      <label className="flex items-center gap-2">
                        {toggleInRow(d, "inspected")} Inspected
                      </label>
                      <label className="flex items-center gap-2">
                        {toggleInRow(d, "shipment")} Shipment
                      </label>
                    </div>
                    {rowActions(d)}
                  </div>
                </>
              );
            }}
          />
        </section>
      </div>
      {confirmDialog}
    </Shell>
  );
}
