import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { ImportError, TableTransfer } from "@/components/table-transfer";
import { cellNumber } from "@/lib/excel";
import { useConfirmDelete } from "@/components/confirm-delete";
import { AddButton, Sheet } from "@/components/Sheet";
import { DataList } from "@/components/DataList";
import {
  addQuotedHour,
  removeQuotedHour,
  updateQuotedHour,
  useStore,
  type QuotedHour,
  type QuotedHourInput,
} from "@/lib/store";

const PAGE_SIZE = 20;
const currency = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

// Price = hours x rate x quantity, as in the old system; blank unless all three are set.
const priceOf = (quote: { jobHours: number; rate: number; quantity: number }) =>
  quote.jobHours && quote.rate && quote.quantity
    ? quote.jobHours * quote.rate * quote.quantity
    : null;
const priceText = (price: number | null) => (price === null ? "—" : currency.format(price));

type Form = Omit<QuotedHourInput, "quantity" | "jobHours" | "rate"> & {
  quantity: string;
  jobHours: string;
  rate: string;
};

const emptyForm: Form = {
  jobId: "",
  drawingNumber: "",
  quantity: "",
  machineId: "",
  jobHours: "",
  rate: "",
  description: "",
  timeRemaining: "",
};

const textareaClass =
  "w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none";

export const Route = createFileRoute("/quoted-hours")({
  head: () => ({
    meta: [
      { title: "Quoted Hours — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Quote job hours per drawing and machine, with rate and price, in the TechPro console.",
      },
      { property: "og:title", content: "Quoted Hours — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Quote job hours and prices in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotedHoursPage,
});

function QuotedHoursPage() {
  const { quotedHours, jobs, machines, miiOrderDetails } = useStore();
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const [form, setForm] = useState<Form>(emptyForm);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const jobNumber = (id: string) => jobs.find((j) => j.id === id)?.jobNumber || "—";
  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? "—";
  const totalPrice = quotedHours.reduce((sum, quote) => sum + (priceOf(quote) ?? 0), 0);
  const formPrice = (Number(form.jobHours) || 0) * (Number(form.rate) || 0);

  // Drawing numbers from MII Order Details for a job (unique, non-blank).
  const drawingsForJob = (jobId: string) => [
    ...new Set(
      miiOrderDetails
        .filter((d) => d.jobId === jobId && d.drawingNumber)
        .map((d) => d.drawingNumber),
    ),
  ];
  // Keep a quote's saved drawing listed even if it was since removed from MII.
  const drawingOptions = [
    ...new Set([
      ...drawingsForJob(form.jobId),
      ...(form.drawingNumber ? [form.drawingNumber] : []),
    ]),
  ];

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, jobId: jobs[0]?.id ?? "", machineId: machines[0]?.id ?? "" });
    setOpen(true);
  };

  const openEdit = (quote: QuotedHour) => {
    setEditId(quote.id);
    setForm({
      jobId: quote.jobId,
      drawingNumber: quote.drawingNumber,
      quantity: String(quote.quantity),
      machineId: quote.machineId,
      jobHours: String(quote.jobHours),
      rate: String(quote.rate),
      description: quote.description,
      timeRemaining: quote.timeRemaining,
    });
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value: QuotedHourInput = {
      ...form,
      quantity: Number(form.quantity) || 0,
      jobHours: Number(form.jobHours) || 0,
      rate: Math.round((Number(form.rate) || 0) * 100) / 100,
      description: form.description.trim(),
      timeRemaining: form.timeRemaining.trim(),
    };
    if (editId) updateQuotedHour(editId, value);
    else addQuotedHour(value);
    closeSheet();
  };

  const rowActions = (quote: QuotedHour) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <button
        onClick={() => openEdit(quote)}
        aria-label={`Edit quote for job ${jobNumber(quote.jobId)}`}
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() =>
          confirmDelete({
            title: "Delete this quote?",
            description: "This cannot be undone.",
            onConfirm: () => removeQuotedHour(quote.id),
          })
        }
        aria-label={`Remove quote for job ${jobNumber(quote.jobId)}`}
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const selectField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    placeholder: { value: string; label: string } | null,
  ) => (
    <>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <div className="relative mb-4">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} appearance-none pr-9`}
        >
          {placeholder && <option value={placeholder.value}>{placeholder.label}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
          ▾
        </span>
      </div>
    </>
  );

  const numberField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    extra: { step?: string; prefix?: string } = {},
  ) => (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {extra.prefix && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-fg">
            {extra.prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          min="0"
          step={extra.step ?? "any"}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} ${extra.prefix ? "pl-7" : ""}`}
        />
      </div>
    </div>
  );

  const transfer = (
    <TableTransfer
      name="quoted-hours"
      label="quotes"
      rows={quotedHours}
      columns={[
        { header: "Job number", value: (q) => jobs.find((j) => j.id === q.jobId)?.jobNumber ?? "" },
        { header: "Drawing number", value: (q) => q.drawingNumber },
        { header: "Quantity", value: (q) => q.quantity, width: 10 },
        {
          header: "Machine or service",
          value: (q) => machines.find((m) => m.id === q.machineId)?.name ?? "",
          width: 24,
        },
        { header: "Job hours", value: (q) => q.jobHours, width: 11 },
        { header: "Rate", value: (q) => q.rate, width: 10 },
        // Worked out from hours and rate; ignored on import.
        { header: "Price", value: (q) => priceOf(q), width: 12 },
        { header: "Description", value: (q) => q.description, width: 36 },
        { header: "Time remaining", value: (q) => q.timeRemaining },
      ]}
      parse={({ get }): QuotedHourInput => {
        const jobText = get("Job number");
        const job = jobs.find((j) => j.jobNumber.toLowerCase() === jobText.toLowerCase());
        if (!jobText) throw new ImportError("no job number");
        if (!job) throw new ImportError('unknown job number "' + jobText + '"');
        const machineText = get("Machine or service");
        const machine = machines.find((m) => m.name.toLowerCase() === machineText.toLowerCase());
        if (machineText && !machine) throw new ImportError('unknown machine "' + machineText + '"');
        const quantity = cellNumber(get("Quantity"));
        const jobHours = cellNumber(get("Job hours"));
        const rate = cellNumber(get("Rate"));
        if (quantity === null || jobHours === null || rate === null) {
          throw new ImportError("quantity, job hours or rate is not a number");
        }
        return {
          jobId: job.id,
          drawingNumber: get("Drawing number"),
          quantity,
          machineId: machine?.id ?? "",
          jobHours,
          rate,
          description: get("Description"),
          timeRemaining: get("Time remaining"),
        };
      }}
      add={addQuotedHour}
    />
  );

  return (
    <Shell
      eyebrow="Job · Quoted Hours"
      title="Quoted Hours"
      action={<AddButton label="Add quote" onClick={openNew} />}
    >
      <Sheet open={open} title={editId ? "Edit quote" : "New quote"} onClose={closeSheet}>
        <form onSubmit={submit}>
          {selectField(
            "qh-job",
            "Job number",
            form.jobId,
            // A drawing belongs to a job, so clear it when it isn't on the new job.
            (jobId) =>
              setForm({
                ...form,
                jobId,
                drawingNumber: drawingsForJob(jobId).includes(form.drawingNumber)
                  ? form.drawingNumber
                  : "",
              }),
            jobs.map((j) => ({ value: j.id, label: j.jobNumber || "(no job number)" })),
            jobs.length === 0 ? { value: "", label: "Add a job first" } : null,
          )}

          {selectField(
            "qh-drawing",
            "Drawing number",
            form.drawingNumber,
            (drawingNumber) => setForm({ ...form, drawingNumber }),
            drawingOptions.map((d) => ({ value: d, label: d })),
            { value: "", label: "No drawing" },
          )}

          {selectField(
            "qh-machine",
            "Machine or service",
            form.machineId,
            (machineId) => setForm({ ...form, machineId }),
            machines.map((m) => ({ value: m.id, label: m.name })),
            machines.length === 0 ? { value: "", label: "Add a machine first" } : null,
          )}

          <div className="mb-4 grid grid-cols-3 gap-3">
            {numberField("qh-qty", "Quantity", form.quantity, (quantity) =>
              setForm({ ...form, quantity }),
            )}
            {numberField("qh-hours", "Job hours", form.jobHours, (jobHours) =>
              setForm({ ...form, jobHours }),
            )}
            {numberField("qh-rate", "Rate", form.rate, (rate) => setForm({ ...form, rate }), {
              step: "0.01",
              prefix: "$",
            })}
          </div>

          <div className="mb-4 flex items-center justify-between rounded-xl bg-chip px-3 py-2.5">
            <span className="text-sm font-medium text-muted-fg">Price (job hours × rate)</span>
            <span className="font-mono text-sm font-semibold">{currency.format(formPrice)}</span>
          </div>

          <label className={labelClass} htmlFor="qh-description">
            Description
          </label>
          <textarea
            id="qh-description"
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="What the quote covers…"
            className={`${textareaClass} mb-4`}
          />

          <label className={labelClass} htmlFor="qh-time-remaining">
            Time remaining
          </label>
          <textarea
            id="qh-time-remaining"
            rows={2}
            value={form.timeRemaining}
            onChange={(event) => setForm({ ...form, timeRemaining: event.target.value })}
            placeholder="e.g. 6 hrs left on second op"
            className={`${textareaClass} mb-5`}
          />

          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            {editId ? "Save changes" : "Add quote"}
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="font-display text-base font-semibold">Quotes</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">
                {quotedHours.length} quotes · {currency.format(totalPrice)}
              </span>
            </div>
          </div>

          <DataList
            searchable
            rows={quotedHours}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "quotes" }}
            rowKey={(quote) => quote.id}
            breakpoint="xl"
            minWidth="84rem"
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No quotes yet. Add your first one.
              </p>
            }
            columns={[
              {
                header: "Job number",
                filter: "select",
                width: "6rem",
                sortValue: (q) => jobNumber(q.jobId),
                cell: (q) => (
                  <span className="font-mono text-[12px] font-semibold">{jobNumber(q.jobId)}</span>
                ),
              },
              {
                header: "Drawing number",
                width: "7rem",
                sortValue: (q) => q.drawingNumber,
                cell: (q) => (
                  <span className="font-mono text-[12px] text-muted-fg">
                    {q.drawingNumber || "—"}
                  </span>
                ),
              },
              {
                header: "Qty",
                width: "4.5rem",
                align: "right",
                sortValue: (q) => q.quantity,
                cell: (q) => <span className="font-mono text-[13px]">{q.quantity}</span>,
              },
              {
                header: "Machine or service",
                filter: "select",
                width: "minmax(8rem,0.8fr)",
                sortValue: (q) => machineName(q.machineId),
                cell: (q) => <p className="truncate text-sm">{machineName(q.machineId)}</p>,
              },
              {
                header: "Job hours",
                width: "5rem",
                align: "right",
                sortValue: (q) => q.jobHours,
                cell: (q) => <span className="font-mono text-[13px]">{q.jobHours}</span>,
              },
              {
                header: "Rate",
                width: "6rem",
                align: "right",
                sortValue: (q) => q.rate,
                cell: (q) => (
                  <span className="font-mono text-[12px] text-muted-fg">
                    {currency.format(q.rate)}
                  </span>
                ),
              },
              {
                header: "Price",
                width: "7rem",
                align: "right",
                sortValue: (q) => priceOf(q) ?? "",
                cell: (q) => (
                  <span className="font-mono text-[13px] font-semibold">
                    {priceText(priceOf(q))}
                  </span>
                ),
              },
              {
                header: "Description",
                width: "minmax(10rem,1.2fr)",
                cell: (q) => (
                  <p className="line-clamp-2 text-[12px] text-muted-fg">{q.description || "—"}</p>
                ),
              },
              {
                header: "Time remaining",
                width: "minmax(9rem,1fr)",
                cell: (q) => (
                  <p className="line-clamp-2 text-[12px] text-muted-fg">{q.timeRemaining || "—"}</p>
                ),
              },
              { header: "Action", width: "5rem", align: "right", cell: rowActions },
            ]}
            card={(q) => (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{machineName(q.machineId)}</p>
                    <p className="truncate font-mono text-[12px] text-muted-fg">
                      Job {jobNumber(q.jobId)}
                      {q.drawingNumber ? ` · Dwg ${q.drawingNumber}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold">
                    {priceText(priceOf(q))}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-fg">
                  <span>
                    Qty <span className="text-ink">{q.quantity}</span>
                  </span>
                  <span>
                    {q.jobHours} hrs × {currency.format(q.rate)}
                  </span>
                </div>
                {q.description && <p className="mt-1.5 text-[13px]">{q.description}</p>}
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="min-w-0 text-[12px] text-muted-fg">
                    {q.timeRemaining ? `Remaining: ${q.timeRemaining}` : ""}
                  </p>
                  {rowActions(q)}
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
