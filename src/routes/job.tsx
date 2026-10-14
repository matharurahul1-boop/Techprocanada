import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, FileCheck2, FileText, Pencil, Timer, Trash2, X } from "lucide-react";

import { Shell } from "@/components/Shell";
import { ImportError, TableTransfer } from "@/components/table-transfer";
import { cellBool, cellDate, cellNumber, cellOption } from "@/lib/excel";
import { useConfirmDelete } from "@/components/confirm-delete";
import { AddButton } from "@/components/Sheet";
import { JobSheet } from "@/components/job-sheets";
import { JobWheel } from "@/components/job-wheel";
import { JobWizardSheet } from "@/components/job-wizard";
import { DataList } from "@/components/DataList";
import { Switch } from "@/components/ui/switch";
import {
  JOB_STATUSES,
  addJob,
  getPackingSlipUrl,
  removeJob,
  removePackingSlips,
  updateJob,
  uploadPackingSlip,
  useStore,
  type Job,
  type JobInput,
  type JobStatus,
} from "@/lib/store";
import { JOB_STATUS_COLOR as STATUS_COLOR } from "@/lib/order-status";
import { daysLeft, fileName, formatDate } from "@/lib/job-format";

const PAGE_SIZE = 20;

const daysText = (days: number | null) =>
  days === null ? "—" : days >= 0 ? `${days} left` : `${-days} behind`;

const daysTone = (days: number | null) =>
  days === null ? "text-muted-fg" : days >= 0 ? "text-good" : "text-destructive";

const toInput = ({ id: _id, ...job }: Job): JobInput => job;

export const Route = createFileRoute("/job")({
  head: () => ({
    meta: [
      { title: "Job — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Track jobs, due dates, progress and packing slips in the TechPro inventory console.",
      },
      { property: "og:title", content: "Job — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track jobs in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobPage,
});

function JobPage() {
  const { jobs, companies, miiOrderDetails, inspections, machiningHours } = useStore();
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [companyFilter, setCompanyFilter] = useState("");
  const rows = jobs.filter(
    (job) =>
      (!statusFilter || job.status === statusFilter) &&
      (!companyFilter || job.companyId === companyFilter),
  );

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? "—";

  const openEdit = (job: Job) => {
    setEditId(job.id);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
  };

  const openSlip = async (path: string) => {
    // Open the tab synchronously so the browser doesn't treat it as a popup.
    const tab = window.open("", "_blank");
    const url = await getPackingSlipUrl(path);
    if (url && tab) tab.location.href = url;
    else tab?.close();
  };

  const statusPill = (job: Job) => (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[job.status]}`}
    >
      {job.status}
    </span>
  );

  const slipLinks = (job: Job) => (
    <div className="flex flex-col gap-1">
      {job.packingSlips.map((path) => (
        <button
          key={path}
          type="button"
          onClick={() => openSlip(path)}
          className="inline-flex max-w-[180px] items-center gap-1 text-left text-accent-brand hover:underline"
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{fileName(path)}</span>
        </button>
      ))}
    </div>
  );

  const prioritySwitch = (job: Job) => (
    <Switch
      checked={job.priority}
      onCheckedChange={(priority) => updateJob(job.id, { ...toInput(job), priority })}
      aria-label={`Priority for job ${job.jobNumber}`}
    />
  );

  // A job's sub-tables (the tabs on its details page) with how many rows each holds.
  const subTables = (job: Job) => {
    const drawingIds = new Set(miiOrderDetails.filter((d) => d.jobId === job.id).map((d) => d.id));
    return [
      {
        tab: "orders",
        label: "Order details",
        short: "Orders",
        icon: ClipboardList,
        count: drawingIds.size,
      },
      {
        tab: "inspections",
        label: "Inspections",
        short: "Inspections",
        icon: FileCheck2,
        count: inspections.filter(
          (i) => drawingIds.has(i.jobDetailId) || drawingIds.has(i.drawingDetailId),
        ).length,
      },
      {
        tab: "machining",
        label: "Machining hours",
        short: "Machining",
        icon: Timer,
        count: machiningHours.filter((entry) => entry.jobId === job.id).length,
      },
    ] as const;
  };

  const wheel = (job: Job) => (
    <JobWheel
      jobId={job.id}
      hubLabel="Job"
      hubText={job.jobNumber}
      spokes={subTables(job)}
      triggerLabel={`Open tables for job ${job.jobNumber}`}
    />
  );

  const rowActions = (job: Job) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      {wheel(job)}
      <button
        onClick={() => openEdit(job)}
        aria-label={`Edit job ${job.jobNumber}`}
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() =>
          confirmDelete({
            title: `Delete job ${job.jobNumber}?`,
            description:
              "Its order details, machining hours and quotes are kept but lose their link to this job.",
            onConfirm: () => removeJob(job.id),
          })
        }
        aria-label={`Remove job ${job.jobNumber}`}
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const transfer = (
    <TableTransfer
      name="jobs"
      label="jobs"
      rows={rows}
      columns={[
        { header: "Company", value: (job) => companyName(job.companyId), width: 28 },
        { header: "Job number", value: (job) => job.jobNumber },
        { header: "Date", value: (job) => job.date },
        { header: "Due date", value: (job) => job.dueDate },
        { header: "No. of items", value: (job) => job.numberOfItems, width: 12 },
        { header: "Completed items", value: (job) => job.completedItems },
        { header: "Status", value: (job) => job.status },
        { header: "PO number", value: (job) => job.poNumber },
        { header: "Ship date", value: (job) => job.shipDate },
        { header: "Priority", value: (job) => (job.priority ? "Yes" : "No"), width: 10 },
      ]}
      parse={({ get }): JobInput => {
        const jobNumber = get("Job number");
        if (!jobNumber) throw new ImportError("no job number");
        const companyText = get("Company");
        const company = companies.find((c) => c.name.toLowerCase() === companyText.toLowerCase());
        if (companyText && companyText !== "—" && !company) {
          throw new ImportError('unknown company "' + companyText + '"');
        }
        const date = cellDate(get("Date"));
        const dueDate = cellDate(get("Due date"));
        const shipDate = cellDate(get("Ship date"));
        if (date === null || dueDate === null || shipDate === null) {
          throw new ImportError("a date is not in YYYY-MM-DD or DD/MM/YYYY form");
        }
        const numberOfItems = cellNumber(get("Items"));
        const completedItems = cellNumber(get("Completed items"));
        if (numberOfItems === null || completedItems === null) {
          throw new ImportError("items is not a number");
        }
        const statusText = get("Status");
        const status = statusText ? cellOption(statusText, JOB_STATUSES) : "Not Started";
        if (!status) throw new ImportError('unknown status "' + statusText + '"');
        return {
          companyId: company?.id ?? "",
          jobNumber,
          date,
          dueDate,
          numberOfItems,
          completedItems,
          job: "",
          status,
          poNumber: get("PO number"),
          shipDate,
          packingSlips: [],
          priority: cellBool(get("Priority")),
        };
      }}
      add={addJob}
    />
  );

  const filterClass =
    "glass-control h-9 max-w-full rounded-xl border px-3 text-[12px] font-semibold transition focus:ring-2 focus:ring-accent-brand focus:outline-none";

  return (
    <Shell
      eyebrow="Job · Job"
      title="Jobs"
      action={<AddButton label="Add job" onClick={() => setWizardOpen(true)} />}
    >
      {/* Editing uses the single job form; adding walks through the job and its first
          drawing, inspection and machining entry in one sheet. */}
      <JobSheet
        open={open}
        editing={jobs.find((j) => j.id === editId) ?? null}
        onClose={closeSheet}
      />
      <JobWizardSheet open={wizardOpen} onClose={() => setWizardOpen(false)} />

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Jobs</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">
                {rows.length === jobs.length ? jobs.length : rows.length + " of " + jobs.length}{" "}
                jobs
              </span>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as JobStatus | "");
                setPage(1);
              }}
              className={filterClass}
            >
              <option value="">All statuses</option>
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by company"
              value={companyFilter}
              onChange={(event) => {
                setCompanyFilter(event.target.value);
                setPage(1);
              }}
              className={filterClass}
            >
              <option value="">All companies</option>
              {[...companies]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
            </select>
            {(statusFilter || companyFilter) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("");
                  setCompanyFilter("");
                  setPage(1);
                }}
                className="rounded-full px-2 py-1 text-[12px] font-semibold text-muted-fg transition hover:text-ink"
              >
                Clear filters
              </button>
            )}
          </div>

          <DataList
            rows={rows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "jobs" }}
            rowKey={(job) => job.id}
            breakpoint="xl"
            minWidth="74.5rem"
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                {jobs.length === 0
                  ? "No jobs yet. Add your first one."
                  : "No jobs match these filters."}
              </p>
            }
            columns={[
              {
                header: "Company",
                sortValue: (job) => companyName(job.companyId),
                width: "minmax(5.5rem,7fr)",
                cell: (job) => (
                  <p className="truncate text-sm font-semibold">{companyName(job.companyId)}</p>
                ),
              },
              {
                header: "Job number",
                sortValue: (job) => job.jobNumber,
                width: "minmax(5rem,5fr)",
                cell: (job) => (
                  <p className="truncate font-mono text-[12px] font-semibold">
                    {job.jobNumber || "—"}
                  </p>
                ),
              },
              {
                // Job date on top, due date below; sorts by due date.
                header: "Date / Due",
                sortValue: (job) => job.dueDate,
                width: "minmax(5rem,5fr)",
                cell: (job) => (
                  <div className="font-mono text-[12px] leading-tight">
                    <p className="text-muted-fg" title="Date">
                      {formatDate(job.date)}
                    </p>
                    <p className="font-semibold" title="Due date">
                      {formatDate(job.dueDate)}
                    </p>
                  </div>
                ),
              },
              {
                // Completed out of total; sorts by how many are still to do.
                header: "Items completed / No. of items",
                sortValue: (job) => job.numberOfItems - job.completedItems,
                width: "minmax(7rem,7fr)",
                cell: (job) => (
                  <span className="font-mono text-[13px]" title="Completed / total items">
                    <span className="font-semibold">{job.completedItems}</span>
                    <span className="text-muted-fg"> / {job.numberOfItems}</span>
                  </span>
                ),
              },
              {
                header: "Status",
                sortValue: (job) => JOB_STATUSES.indexOf(job.status),
                width: "minmax(8rem,8fr)",
                cell: statusPill,
              },
              {
                header: "PO number",
                sortValue: (job) => job.poNumber,
                width: "minmax(5rem,5fr)",
                cell: (job) => (
                  <p className="truncate font-mono text-[12px] text-muted-fg">
                    {job.poNumber || "—"}
                  </p>
                ),
              },
              {
                header: "Days",
                sortValue: (job) => daysLeft(job.date, job.dueDate) ?? "",
                width: "minmax(4.5rem,4.5fr)",
                cell: (job) => {
                  const days = daysLeft(job.date, job.dueDate);
                  return (
                    <span className={`font-mono text-[12px] font-semibold ${daysTone(days)}`}>
                      {daysText(days)}
                    </span>
                  );
                },
              },
              {
                header: "Ship date",
                sortValue: (job) => job.shipDate,
                width: "minmax(5rem,5fr)",
                cell: (job) => (
                  <span className="font-mono text-[12px] text-muted-fg">{formatDate(job.shipDate)}</span>
                ),
              },
              {
                header: "Packing slips",
                width: "minmax(5rem,6fr)",
                cell: (job) =>
                  job.packingSlips.length === 0 ? (
                    <span className="text-muted-fg">—</span>
                  ) : (
                    <div className="text-[12px]">{slipLinks(job)}</div>
                  ),
              },
              {
                header: "Priority",
                sortValue: (job) => (job.priority ? 1 : 0),
                width: "minmax(4rem,4fr)",
                cell: prioritySwitch,
              },
              { header: "Action", width: "7.5rem", align: "right", cell: rowActions },
            ]}
            card={(job) => {
              const days = daysLeft(job.date, job.dueDate);
              return (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{companyName(job.companyId)}</p>
                      <p className="truncate font-mono text-[12px] text-muted-fg">
                        <span className="font-semibold text-ink">{job.jobNumber || "—"}</span>
                        {job.poNumber ? ` · PO ${job.poNumber}` : ""}
                      </p>
                    </div>
                    {statusPill(job)}
                  </div>


                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-fg">
                    <span>Date {formatDate(job.date)}</span>
                    <span>Due {formatDate(job.dueDate)}</span>
                    <span>Ship {formatDate(job.shipDate)}</span>
                    <span>
                      Items <span className="text-ink">{job.completedItems}</span>/
                      {job.numberOfItems}
                    </span>
                    <span className={`font-semibold ${daysTone(days)}`}>{daysText(days)}</span>
                  </div>

                  {job.packingSlips.length > 0 && (
                    <div className="mt-2 text-[12px]">{slipLinks(job)}</div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-[12px] font-medium text-muted-fg">
                      {prioritySwitch(job)}
                      Priority
                    </label>
                    {rowActions(job)}
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
