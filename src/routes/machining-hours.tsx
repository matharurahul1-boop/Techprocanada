import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Shell } from "@/components/Shell";
import { ImportError, TableTransfer } from "@/components/table-transfer";
import { cellDate } from "@/lib/excel";
import { formatDate, formatDuration, parseDuration } from "@/lib/job-format";
import { useConfirmDelete } from "@/components/confirm-delete";
import { AddButton } from "@/components/Sheet";
import { DataList } from "@/components/DataList";
import { FilterBanner, searchFlag, searchText, useOpenOnAdd } from "@/components/drill-down";
import { MachiningHourSheet } from "@/components/job-sheets";
import {
  removeMachiningHour,
  useStore,
  type MachiningHour,
  addMachiningHour,
  type MachiningHourInput,
} from "@/lib/store";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/machining-hours")({
  // ?job=<job id>&drawing=<drawing number> shows only matching entries;
  // ?add opens the new-entry form straight away (after an inspection was added).
  validateSearch: (
    search: Record<string, unknown>,
  ): { job?: string | undefined; drawing?: string | undefined; add?: boolean | undefined } => ({
    job: searchText(search["job"]),
    drawing: searchText(search["drawing"]),
    add: searchFlag(search["add"]),
  }),
  head: () => ({
    meta: [
      { title: "Machining Hours — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Log machining work by date, user, machine, job and drawing in the TechPro console.",
      },
      { property: "og:title", content: "Machining Hours — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Log machining work against jobs in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MachiningHoursPage,
});

function MachiningHoursPage() {
  const { machiningHours, users, machines, jobs } = useStore();
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { job: jobFilter, drawing: drawingFilter, add } = Route.useSearch();
  const navigate = Route.useNavigate();

  const rows = machiningHours.filter(
    (entry) =>
      (!jobFilter || entry.jobId === jobFilter) &&
      (!drawingFilter || entry.drawingNumber === drawingFilter),
  );

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? "—";
  const jobNumber = (id: string) => jobs.find((j) => j.id === id)?.jobNumber ?? "—";

  const openNew = () => {
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (entry: MachiningHour) => {
    setEditId(entry.id);
    setOpen(true);
  };

  useOpenOnAdd(add, openNew, () =>
    navigate({ search: (prev) => ({ ...prev, add: undefined }), replace: true }),
  );

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
  };

  const rowActions = (entry: MachiningHour) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <button
        onClick={() => openEdit(entry)}
        aria-label={`Edit machining entry for ${machineName(entry.machineId)}`}
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() =>
          confirmDelete({
            title: "Delete this machining entry?",
            description: "This cannot be undone.",
            onConfirm: () => removeMachiningHour(entry.id),
          })
        }
        aria-label={`Remove machining entry for ${machineName(entry.machineId)}`}
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const named = <T extends { name: string }>(list: T[], text: string) =>
    list.find((entry) => entry.name.toLowerCase() === text.toLowerCase());
  const transfer = (
    <TableTransfer
      name="machining-hours"
      label="machining entries"
      rows={rows}
      columns={[
        { header: "Date", value: (entry) => entry.date },
        { header: "User", value: (entry) => users.find((u) => u.id === entry.userId)?.name ?? "" },
        {
          header: "Machine",
          value: (entry) => machines.find((m) => m.id === entry.machineId)?.name ?? "",
        },
        { header: "Description", value: (entry) => entry.description, width: 40 },
        {
          header: "Job number",
          value: (entry) => jobs.find((j) => j.id === entry.jobId)?.jobNumber ?? "",
        },
        { header: "Drawing number", value: (entry) => entry.drawingNumber },
        {
          header: "Hours",
          value: (entry) =>
            entry.durationMinutes === null ? "" : formatDuration(entry.durationMinutes),
          width: 10,
        },
      ]}
      parse={({ get }): MachiningHourInput => {
        const durationMinutes = parseDuration(get("Hours"));
        if (Number.isNaN(durationMinutes))
          throw new ImportError("hours must be h:mm or decimal hours");
        const date = cellDate(get("Date"));
        if (!date) throw new ImportError("date is missing or not in YYYY-MM-DD or DD/MM/YYYY form");
        const userText = get("User");
        const user = named(users, userText);
        if (userText && !user) throw new ImportError('unknown user "' + userText + '"');
        const machineText = get("Machine");
        const machine = named(machines, machineText);
        if (machineText && !machine) throw new ImportError('unknown machine "' + machineText + '"');
        const jobText = get("Job number");
        const job = jobs.find((j) => j.jobNumber.toLowerCase() === jobText.toLowerCase());
        if (jobText && !job) throw new ImportError('unknown job number "' + jobText + '"');
        return {
          date,
          userId: user?.id ?? "",
          machineId: machine?.id ?? "",
          description: get("Description"),
          jobId: job?.id ?? "",
          drawingNumber: get("Drawing number"),
          durationMinutes,
          quantity: null,
        };
      }}
      add={addMachiningHour}
    />
  );

  return (
    <Shell
      eyebrow="Job · Machining Hours"
      title="Machining Hours"
      action={<AddButton label="Add machining entry" onClick={openNew} />}
    >
      <MachiningHourSheet
        open={open}
        editing={machiningHours.find((entry) => entry.id === editId) ?? null}
        defaults={{ jobId: jobFilter, drawingNumber: drawingFilter }}
        onClose={closeSheet}
      />

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Machining entries</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">{rows.length} entries</span>
            </div>
          </div>

          {(jobFilter || drawingFilter) && (
            <FilterBanner
              label={[
                jobFilter ? `Job ${jobNumber(jobFilter)}` : "",
                drawingFilter ? `Drawing ${drawingFilter}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              onClear={() => navigate({ search: {} })}
            />
          )}

          <DataList
            rows={rows}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "entries" }}
            rowKey={(entry) => entry.id}
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No machining entries yet. Add your first one.
              </p>
            }
            columns={[
              {
                header: "Date",
                width: "7rem",
                sortValue: (entry) => entry.date,
                cell: (entry) => (
                  <span className="font-mono text-[12px] text-muted-fg">{formatDate(entry.date)}</span>
                ),
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
                header: "Job number",
                width: "7rem",
                sortValue: (entry) => jobNumber(entry.jobId),
                cell: (entry) => (
                  <span className="font-mono text-[12px]">{jobNumber(entry.jobId)}</span>
                ),
              },
              {
                header: "Drawing number",
                width: "8rem",
                sortValue: (entry) => entry.drawingNumber,
                cell: (entry) => (
                  <span className="font-mono text-[12px] text-muted-fg">
                    {entry.drawingNumber || "—"}
                  </span>
                ),
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
              { header: "Action", width: "5rem", align: "right", cell: rowActions },
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
                    Job <span className="text-ink">{jobNumber(entry.jobId)}</span>
                    {entry.drawingNumber ? ` · Dwg ${entry.drawingNumber}` : ""}
                    {entry.durationMinutes !== null
                      ? ` · ${formatDuration(entry.durationMinutes)} h`
                      : ""}
                  </p>
                  {rowActions(entry)}
                </div>
              </>
            )}
          />
        </section>
      </div>
      {confirmDialog}
    </Shell>
  );
}
