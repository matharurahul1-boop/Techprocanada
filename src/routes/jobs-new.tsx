import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { ImportError, TableTransfer } from "@/components/table-transfer";
import { cellBool, cellDate, cellNumber, cellOption } from "@/lib/excel";
import { useConfirmDelete } from "@/components/confirm-delete";
import { AddButton, Sheet } from "@/components/Sheet";
import { DataList } from "@/components/DataList";
import { Switch } from "@/components/ui/switch";
import {
  CURRENCIES,
  JOB_STATUSES,
  addMiiJob,
  removeMiiJob,
  updateMiiJob,
  useStore,
  type JobStatus,
  type MiiJob,
  type MiiJobInput,
} from "@/lib/store";
import { COMPANY_PRIORITY_COLOR, JOB_STATUS_COLOR } from "@/lib/order-status";
import { daysLeft as daysBetween, formatDate, poAmountFor } from "@/lib/job-format";

const PAGE_SIZE = 20;

// Number fields are typed as text and converted on save.
type Form = Omit<
  MiiJobInput,
  "numberOfItems" | "completedItems" | "amount" | "currency" | "poAmount"
> & {
  numberOfItems: string;
  completedItems: string;
  amount: string;
  currency: string;
  poAmount: string;
};

const emptyForm: Form = {
  jobNumber: "",
  poNumber: "",
  companyId: "",
  date: "",
  dueDate: "",
  numberOfItems: "",
  completedItems: "",
  status: "Not Started",
  shippedDate: "",
  amount: "",
  currency: "",
  poAmount: "",
  essential: false,
  inspection: false,
  remarks: "",
};

const toForm = ({ id: _id, ...job }: MiiJob): Form => ({
  ...job,
  numberOfItems: String(job.numberOfItems),
  completedItems: String(job.completedItems),
  amount: job.amount === null ? "" : String(job.amount),
  currency: job.currency === null ? "" : String(job.currency),
  poAmount: job.poAmount === null ? "" : String(job.poAmount),
});

const optionalNumber = (text: string) => (text.trim() === "" ? null : Number(text));

// Positive = days left, negative = days behind.
const daysText = (days: number | null) =>
  days === null ? "—" : days >= 0 ? `${days} left` : `${-days} behind`;

const daysTone = (days: number | null) =>
  days === null ? "text-muted-fg" : days >= 0 ? "text-good" : "text-destructive";

const money = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneyText = (value: number | null, currency: number | null = null) =>
  value === null
    ? "—"
    : `${money.format(value)}${currency !== null && CURRENCIES[currency] ? ` ${CURRENCIES[currency]}` : ""}`;

export const Route = createFileRoute("/jobs-new")({
  head: () => ({
    meta: [
      { title: "Jobs New — TechPro Inventory Console" },
      {
        name: "description",
        content: "Track job numbers, POs, due dates, progress and status in the TechPro console.",
      },
      { property: "og:title", content: "Jobs New — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track jobs in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobsNewPage,
});

function JobsNewPage() {
  const { miiJobs, companies } = useStore();
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const companyOf = (id: string) => companies.find((c) => c.id === id);
  const companyName = (id: string) => companyOf(id)?.name ?? "—";

  // Days left / behind: today to the due date (0 before the start date), never typed in.
  // Blank when either date is missing.
  const daysOf = (job: { date: string; dueDate: string }) => daysBetween(job.date, job.dueDate);

  const companyCell = (job: MiiJob) => {
    const company = companyOf(job.companyId);
    if (!company) return <span className="text-muted-fg">—</span>;
    return (
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-semibold">{company.name}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${COMPANY_PRIORITY_COLOR[company.priority]}`}
          title="Company priority"
        >
          {company.priority}
        </span>
      </div>
    );
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
    setOpen(true);
  };

  const openEdit = (job: MiiJob) => {
    setEditId(job.id);
    setForm(toForm(job));
    setFormError("");
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const jobNumber = form.jobNumber.trim();
    if (!jobNumber) return;
    const amount = optionalNumber(form.amount);
    const poAmount = optionalNumber(form.poAmount);
    if ([amount, poAmount].some((n) => n !== null && !Number.isFinite(n))) {
      setFormError("Amount and PO amount must be numbers.");
      return;
    }
    const value: MiiJobInput = {
      ...form,
      jobNumber,
      poNumber: form.poNumber.trim(),
      remarks: form.remarks.trim(),
      numberOfItems: Number(form.numberOfItems) || 0,
      completedItems: Number(form.completedItems) || 0,
      amount,
      currency: form.currency ? Number(form.currency) : null,
      poAmount,
    };
    if (editId) updateMiiJob(editId, value);
    else addMiiJob(value);
    closeSheet();
  };

  const statusPill = (job: MiiJob) => (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${JOB_STATUS_COLOR[job.status]}`}
    >
      {job.status}
    </span>
  );

  const flags = (job: MiiJob) =>
    job.essential || job.inspection ? (
      <div className="flex flex-wrap gap-1">
        {job.essential && (
          <span className="rounded-full bg-accent-brand/15 px-2 py-0.5 text-[10px] font-semibold text-accent-brand">
            Essential
          </span>
        )}
        {job.inspection && (
          <span className="rounded-full bg-good-soft px-2 py-0.5 text-[10px] font-semibold text-good">
            Inspection
          </span>
        )}
      </div>
    ) : (
      <span className="text-muted-fg">—</span>
    );

  const rowActions = (job: MiiJob) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
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
            description: "This cannot be undone.",
            onConfirm: () => removeMiiJob(job.id),
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

  const textField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    type: "text" | "date" | "number" = "text",
    allowNegative = false,
  ) => (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        {...(type === "number" && {
          min: allowNegative ? undefined : "0",
          step: "any",
          inputMode: "decimal" as const,
        })}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
    </div>
  );

  const selectBox = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    className = "",
  ) => (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const formDays = daysOf(form);

  const transfer = (
    <TableTransfer
      name="jobs-new"
      label="jobs"
      rows={miiJobs}
      columns={[
        { header: "Job number", value: (job) => job.jobNumber },
        {
          header: "Company",
          value: (job) => (job.companyId ? companyName(job.companyId) : ""),
          width: 24,
        },
        { header: "PO number", value: (job) => job.poNumber },
        { header: "Date", value: (job) => job.date },
        { header: "Due date", value: (job) => job.dueDate },
        { header: "No. of items", value: (job) => job.numberOfItems, width: 12 },
        { header: "Items completed", value: (job) => job.completedItems },
        { header: "Status", value: (job) => job.status },
        { header: "Days left/behind", value: (job) => daysOf(job) },
        { header: "Shipped date", value: (job) => job.shippedDate },
        { header: "Amount", value: (job) => job.amount, width: 12 },
        {
          header: "Currency",
          value: (job) => (job.currency !== null ? (CURRENCIES[job.currency] ?? "") : ""),
          width: 10,
        },
        { header: "PO amount", value: (job) => job.poAmount, width: 12 },
        { header: "Essential", value: (job) => (job.essential ? "Yes" : "No"), width: 10 },
        { header: "Inspection", value: (job) => (job.inspection ? "Yes" : "No"), width: 10 },
        { header: "Remarks", value: (job) => job.remarks, width: 40 },
      ]}
      parse={({ get }): MiiJobInput => {
        const jobNumber = get("Job number");
        if (!jobNumber) throw new ImportError("no job number");
        const companyText = get("Company");
        const company = companies.find((c) => c.name.toLowerCase() === companyText.toLowerCase());
        if (companyText && !company) throw new ImportError('unknown company "' + companyText + '"');
        const date = cellDate(get("Date"));
        const dueDate = cellDate(get("Due date"));
        const shippedDate = cellDate(get("Shipped date"));
        if (date === null || dueDate === null || shippedDate === null) {
          throw new ImportError("a date is not in YYYY-MM-DD or DD/MM/YYYY form");
        }
        const numberOfItems = cellNumber(get("No. of items"));
        const completedItems = cellNumber(get("Items completed"));
        const optional = (header: string) => {
          const text = get(header);
          if (!text) return null;
          const n = cellNumber(text);
          if (n === null) throw new ImportError(header.toLowerCase() + " is not a number");
          return n;
        };
        if (numberOfItems === null || completedItems === null) {
          throw new ImportError("item counts are not numbers");
        }
        const statusText = get("Status");
        const status = statusText ? cellOption(statusText, JOB_STATUSES) : "Not Started";
        if (!status) throw new ImportError('unknown status "' + statusText + '"');
        const currencyText = get("Currency");
        const currencyEntry = Object.entries(CURRENCIES).find(
          ([, name]) => name.toLowerCase() === currencyText.toLowerCase(),
        );
        if (currencyText && !currencyEntry)
          throw new ImportError('unknown currency "' + currencyText + '"');
        return {
          jobNumber,
          poNumber: get("PO number"),
          companyId: company?.id ?? "",
          date,
          dueDate,
          numberOfItems,
          completedItems,
          status,
          shippedDate,
          amount: optional("Amount"),
          currency: currencyEntry ? Number(currencyEntry[0]) : null,
          poAmount: optional("PO amount"),
          essential: cellBool(get("Essential")),
          inspection: cellBool(get("Inspection")),
          remarks: get("Remarks"),
        };
      }}
      add={addMiiJob}
    />
  );

  return (
    <Shell
      eyebrow="Job · Jobs New"
      title="Jobs New"
      action={<AddButton label="Add job" onClick={openNew} />}
    >
      <Sheet open={open} title={editId ? "Edit job" : "New job"} onClose={closeSheet} wide>
        <form onSubmit={submit}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {selectBox(
              "jn-company",
              "Company",
              form.companyId,
              (companyId) => setForm({ ...form, companyId }),
              [
                { value: "", label: "No company" },
                ...[...companies]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => ({ value: c.id, label: c.name })),
              ],
            )}
            <div>
              <label className={labelClass} htmlFor="jn-number">
                Job number
              </label>
              <input
                id="jn-number"
                autoFocus
                required
                value={form.jobNumber}
                onChange={(event) => setForm({ ...form, jobNumber: event.target.value })}
                placeholder="e.g. 4953"
                className={fieldClass}
              />
            </div>
            {textField("jn-po", "PO number", form.poNumber, (poNumber) =>
              setForm({ ...form, poNumber }),
            )}
            {textField("jn-date", "Date", form.date, (date) => setForm({ ...form, date }), "date")}
            {textField(
              "jn-due",
              "Due date",
              form.dueDate,
              (dueDate) => setForm({ ...form, dueDate }),
              "date",
            )}
            {textField(
              "jn-shipped",
              "Shipped date",
              form.shippedDate,
              (shippedDate) => setForm({ ...form, shippedDate }),
              "date",
            )}
            {textField(
              "jn-items",
              "No. of items",
              form.numberOfItems,
              (numberOfItems) => setForm({ ...form, numberOfItems }),
              "number",
            )}
            {textField(
              "jn-completed",
              "Items completed",
              form.completedItems,
              (completedItems) => setForm({ ...form, completedItems }),
              "number",
            )}
            {selectBox(
              "jn-status",
              "Status",
              form.status,
              (status) => setForm({ ...form, status: status as JobStatus }),
              JOB_STATUSES.map((status) => ({ value: status, label: status })),
              `font-semibold ${JOB_STATUS_COLOR[form.status]}`,
            )}
            <div>
              <p className={labelClass}>Days left / behind</p>
              <p
                className={`${fieldClass} flex items-center font-mono font-semibold ${daysTone(formDays)}`}
              >
                {daysText(formDays)}
              </p>
              <p className="mt-1 text-[11px] text-muted-fg">
                Counted from today to the due date; 0 before the start date.
              </p>
            </div>
            {textField(
              "jn-amount",
              "Amount",
              form.amount,
              (amount) => setForm({ ...form, amount }),
              "number",
            )}
            {selectBox(
              "jn-currency",
              "Currency",
              form.currency,
              (currency) => setForm({ ...form, currency }),
              [
                { value: "", label: "—" },
                ...Object.entries(CURRENCIES).map(([code, name]) => ({ value: code, label: name })),
              ],
            )}
            <div>
              <p className={labelClass}>PO amount (CAD)</p>
              <p className={`${fieldClass} flex items-center font-mono`}>
                {moneyText(
                  poAmountFor(
                    optionalNumber(form.amount),
                    form.currency ? Number(form.currency) : null,
                  ),
                )}
              </p>
              <p className="mt-1 text-[11px] text-muted-fg">
                The amount, converted at 1.37 when it is in USD.
              </p>
            </div>
          </div>

          <label className={labelClass} htmlFor="jn-remarks">
            Remarks
          </label>
          <textarea
            id="jn-remarks"
            rows={2}
            value={form.remarks}
            onChange={(event) => setForm({ ...form, remarks: event.target.value })}
            placeholder="Notes about this job…"
            className="mb-4 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none"
          />

          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["jn-essential", "Essential", "essential"],
                ["jn-inspection", "Inspection", "inspection"],
              ] as const
            ).map(([id, label, key]) => (
              <label
                key={key}
                htmlFor={id}
                className="flex w-full items-center justify-between rounded-xl bg-chip px-3 py-2.5"
              >
                <span className="text-sm font-medium">{label}</span>
                <Switch
                  id={id}
                  checked={form[key]}
                  onCheckedChange={(checked) => setForm({ ...form, [key]: checked })}
                />
              </label>
            ))}
          </div>

          {formError && <p className="mb-3 text-[12px] text-destructive">{formError}</p>}

          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            {editId ? "Save changes" : "Add job"}
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Jobs</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">{miiJobs.length} jobs</span>
            </div>
          </div>

          <DataList
            searchable
            rows={miiJobs}
            pagination={{ page, onPageChange: setPage, pageSize: PAGE_SIZE, itemLabel: "jobs" }}
            rowKey={(job) => job.id}
            breakpoint="xl"
            minWidth="85rem"
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No jobs yet. Add your first one.
              </p>
            }
            columns={[
              {
                header: "Job number",
                width: "minmax(5rem,5fr)",
                sortValue: (j) => j.jobNumber,
                cell: (j) => (
                  <p className="truncate font-mono text-[13px] font-semibold">{j.jobNumber}</p>
                ),
              },
              {
                header: "Company",
                filter: "select",
                width: "minmax(6rem,7fr)",
                sortValue: (j) => (j.companyId ? companyName(j.companyId) : ""),
                cell: companyCell,
              },
              {
                // Job date on top, due date below; sorts by due date.
                header: "Date / Due",
                width: "minmax(5rem,5fr)",
                sortValue: (j) => j.dueDate,
                cell: (j) => (
                  <div className="font-mono text-[12px] leading-tight">
                    <p className="text-muted-fg" title="Date">
                      {formatDate(j.date)}
                    </p>
                    <p className="font-semibold" title="Due date">
                      {formatDate(j.dueDate)}
                    </p>
                  </div>
                ),
              },
              {
                header: "Items completed / No. of items",
                width: "minmax(7rem,7fr)",
                sortValue: (j) => j.numberOfItems - j.completedItems,
                cell: (j) => (
                  <span className="font-mono text-[13px]">
                    <span className="font-semibold">{j.completedItems}</span>
                    <span className="text-muted-fg"> / {j.numberOfItems}</span>
                  </span>
                ),
              },
              {
                header: "Status",
                filter: "select",
                filterValue: (r) => r.status,
                width: "minmax(8rem,8fr)",
                sortValue: (j) => JOB_STATUSES.indexOf(j.status),
                cell: statusPill,
              },
              {
                header: "PO number",
                width: "minmax(5rem,5fr)",
                sortValue: (j) => j.poNumber,
                cell: (j) => (
                  <p className="truncate font-mono text-[12px] text-muted-fg">
                    {j.poNumber || "—"}
                  </p>
                ),
              },
              {
                header: "Days",
                width: "minmax(5rem,5fr)",
                sortValue: (j) => daysOf(j) ?? "",
                cell: (j) => (
                  <span className={`font-mono text-[12px] font-semibold ${daysTone(daysOf(j))}`}>
                    {daysText(daysOf(j))}
                  </span>
                ),
              },
              {
                header: "Shipped",
                width: "minmax(5rem,5fr)",
                sortValue: (j) => j.shippedDate,
                cell: (j) => (
                  <span className="font-mono text-[12px] text-muted-fg">
                    {formatDate(j.shippedDate)}
                  </span>
                ),
              },
              {
                // Amount with its currency; the PO amount below.
                header: "Amount",
                width: "minmax(6.5rem,6.5fr)",
                sortValue: (j) => j.amount ?? "",
                cell: (j) => (
                  <div className="font-mono text-[12px] leading-tight">
                    <p className="font-semibold">{moneyText(j.amount, j.currency)}</p>
                    {j.poAmount !== null && (
                      <p className="text-muted-fg" title="PO amount">
                        PO {moneyText(j.poAmount)}
                      </p>
                    )}
                  </div>
                ),
              },
              {
                header: "Flags",
                width: "minmax(6rem,6fr)",
                sortValue: (j) => (j.essential ? 2 : 0) + (j.inspection ? 1 : 0),
                cell: flags,
              },
              {
                header: "Remarks",
                width: "minmax(6rem,8fr)",
                cell: (j) => (
                  <p className="line-clamp-2 text-[12px] text-muted-fg">{j.remarks || "—"}</p>
                ),
              },
              { header: "Action", width: "5rem", align: "right", cell: rowActions },
            ]}
            card={(j) => (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold">{j.jobNumber}</p>
                    <p className="truncate text-[12px] text-muted-fg">
                      {j.companyId
                        ? `${companyName(j.companyId)} (${companyOf(j.companyId)?.priority ?? "—"} priority)`
                        : "No company"}
                      {j.poNumber ? ` · PO ${j.poNumber}` : ""}
                    </p>
                  </div>
                  {statusPill(j)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-fg">
                  <span>Due {formatDate(j.dueDate)}</span>
                  <span>
                    Items <span className="text-ink">{j.completedItems}</span>/{j.numberOfItems}
                  </span>
                  <span className={`font-semibold ${daysTone(daysOf(j))}`}>
                    {daysText(daysOf(j))}
                  </span>
                  {j.amount !== null && <span>{moneyText(j.amount, j.currency)}</span>}
                </div>
                {j.remarks && <p className="mt-1.5 text-[12px] text-muted-fg">{j.remarks}</p>}
                <div className="mt-2 flex items-center justify-between gap-3">
                  {flags(j)}
                  {rowActions(j)}
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
