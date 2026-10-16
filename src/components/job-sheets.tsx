import { useState } from "react";
import { X } from "lucide-react";

import { fieldClass, labelClass } from "@/components/Shell";
import { Sheet } from "@/components/Sheet";
import { Switch } from "@/components/ui/switch";
import {
  JOB_STATUSES,
  MII_ORDER_STATUSES,
  addInspection,
  addJob,
  addMachiningHour,
  addMiiOrderDetail,
  removeInspectionDocuments,
  removePackingSlips,
  updateInspection,
  updateJob,
  updateMachiningHour,
  updateMiiOrderDetail,
  uploadInspectionDocument,
  uploadPackingSlip,
  actualMinutesFor,
  useStore,
  type Inspection,
  type Job,
  type JobInput,
  type JobStatus,
  type MachiningHour,
  type MachiningHourInput,
  type MiiOrderDetail,
  type MiiOrderDetailInput,
  type MiiOrderStatus,
} from "@/lib/store";
import {
  ORDER_STATUS_COLOR as STATUS_COLOR,
  ORDER_STATUS_SELECT_COLOR as STATUS_SELECT_COLOR,
} from "@/lib/order-status";
import {
  daysLeft,
  fileName,
  formatDuration,
  formatSubmitted,
  formatVariance,
  parseDuration,
  today,
  varianceOf,
  varianceTone,
} from "@/lib/job-format";

// Add / edit forms for the Job-tab tables. Each sheet is used by its own table page
// and by the job details page; the form inside mounts fresh every time the sheet opens.
// The form bodies are also shown one after another by the new-job wizard.
//
// In every form body `onClose` runs as soon as the form is submitted (a sheet closes on
// it), and `onAdded` runs once a new row has been stored and has its id.

type FormExtras = {
  /** Text for the submit button, instead of "Save changes" / "Add …". */
  submitLabel?: string | undefined;
};

type UploadLock = { saving: boolean; setSaving: (saving: boolean) => void };

// ── Jobs ────────────────────────────────────────────────────────────────────

type JobForm = Omit<JobInput, "numberOfItems" | "completedItems"> & {
  numberOfItems: string;
  completedItems: string;
};

const emptyJobForm: JobForm = {
  companyId: "",
  jobNumber: "",
  date: "",
  dueDate: "",
  numberOfItems: "",
  completedItems: "",
  job: "",
  status: "Not Started",
  poNumber: "",
  shipDate: "",
  packingSlips: [],
  priority: false,
};

type JobSheetProps = {
  /** The job being edited; null adds a new job. */
  editing: Job | null;
  onClose: () => void;
  /** Called with the saved job's id once a new job has been stored. */
  onAdded?: ((id: string) => void) | undefined;
};

export function JobSheet({ open, ...props }: JobSheetProps & { open: boolean }) {
  // Kept here so the sheet cannot be closed while packing slips are uploading.
  const [saving, setSaving] = useState(false);
  return (
    <Sheet
      open={open}
      title={props.editing ? "Edit job" : "New job"}
      onClose={() => {
        if (!saving) props.onClose();
      }}
    >
      <JobFormBody {...props} saving={saving} setSaving={setSaving} />
    </Sheet>
  );
}

export function JobFormBody({
  editing,
  onClose,
  onAdded,
  saving,
  setSaving,
  submitLabel,
}: JobSheetProps & UploadLock & FormExtras) {
  const { companies } = useStore();
  const editId = editing?.id ?? null;
  const [form, setForm] = useState<JobForm>(() => {
    if (!editing) return { ...emptyJobForm, companyId: companies[0]?.id ?? "" };
    const { id: _id, ...job } = editing;
    return {
      ...job,
      numberOfItems: String(job.numberOfItems),
      completedItems: String(job.completedItems),
    };
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const formDays = daysLeft(form.date, form.dueDate);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.jobNumber.trim() || saving || busy) return;
    setSaving(true);
    const uploaded = (await Promise.all(newFiles.map(uploadPackingSlip))).filter(
      (path): path is string => path !== null,
    );
    setSaving(false);
    const value: JobInput = {
      ...form,
      jobNumber: form.jobNumber.trim(),
      job: form.job.trim(),
      poNumber: form.poNumber.trim(),
      numberOfItems: Number(form.numberOfItems) || 0,
      completedItems: Number(form.completedItems) || 0,
      packingSlips: [...form.packingSlips, ...uploaded],
    };
    onClose();
    if (editing) {
      removePackingSlips(editing.packingSlips.filter((path) => !form.packingSlips.includes(path)));
      updateJob(editing.id, value);
      return;
    }
    setBusy(true);
    const id = await addJob(value);
    setBusy(false);
    if (id) onAdded?.(id);
  };

  return (
    <form onSubmit={submit}>
      <label className={labelClass} htmlFor="job-company">
        Company
      </label>
      <div className="relative mb-4">
        <select
          id="job-company"
          required
          value={form.companyId}
          onChange={(event) => setForm({ ...form, companyId: event.target.value })}
          className={`${fieldClass} appearance-none pr-9`}
        >
          {companies.length === 0 && <option value="">Add a company first</option>}
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
          ▾
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="job-number">
            Job number
          </label>
          <input
            id="job-number"
            autoFocus
            required
            value={form.jobNumber}
            onChange={(event) => setForm({ ...form, jobNumber: event.target.value })}
            placeholder="e.g. J-1024"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="job-po">
            PO number
          </label>
          <input
            id="job-po"
            value={form.poNumber}
            onChange={(event) => setForm({ ...form, poNumber: event.target.value })}
            placeholder="e.g. PO-5531"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="job-date">
            Date
          </label>
          <input
            id="job-date"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="job-due-date">
            Due date
          </label>
          <input
            id="job-due-date"
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            className={fieldClass}
          />
        </div>
      </div>
      <p className="mb-4 text-[11px] text-muted-fg">
        Days left/behind:{" "}
        {formDays === null
          ? "set both dates"
          : formDays >= 0
            ? `${formDays} days left`
            : `${-formDays} days behind`}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="job-items">
            Number of items
          </label>
          <input
            id="job-items"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.numberOfItems}
            onChange={(event) => setForm({ ...form, numberOfItems: event.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="job-completed">
            Completed items
          </label>
          <input
            id="job-completed"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.completedItems}
            onChange={(event) => setForm({ ...form, completedItems: event.target.value })}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="job-status">
            Status
          </label>
          <select
            id="job-status"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as JobStatus })}
            className={fieldClass}
          >
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="job-ship-date">
            Ship date
          </label>
          <input
            id="job-ship-date"
            type="date"
            value={form.shipDate}
            onChange={(event) => setForm({ ...form, shipDate: event.target.value })}
            className={fieldClass}
          />
        </div>
      </div>

      <label className={labelClass} htmlFor="job-slips">
        Packing slips
      </label>
      <input
        id="job-slips"
        type="file"
        multiple
        onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))}
        className="mb-1 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line file:mr-3 file:rounded-lg file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-semibold"
      />
      <p className="mb-2 text-[11px] text-muted-fg">
        {newFiles.length > 0
          ? `Selected: ${newFiles.map((file) => file.name).join(", ")}`
          : "PDF or image files"}
      </p>
      {form.packingSlips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {form.packingSlips.map((path) => (
            <span
              key={path}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-chip py-1 pr-1 pl-2.5 text-[12px]"
            >
              <span className="truncate">{fileName(path)}</span>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    packingSlips: form.packingSlips.filter((p) => p !== path),
                  })
                }
                aria-label={`Remove ${fileName(path)}`}
                className="grid size-5 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <label
        htmlFor="job-priority"
        className="mt-2 mb-5 flex w-full items-center justify-between rounded-xl bg-chip px-3 py-2.5"
      >
        <span className="text-sm font-medium">Priority</span>
        <Switch
          id="job-priority"
          checked={form.priority}
          onCheckedChange={(priority) => setForm({ ...form, priority })}
        />
      </label>

      <button
        type="submit"
        disabled={saving || busy}
        className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {saving
          ? "Uploading…"
          : busy
            ? "Saving…"
            : (submitLabel ?? (editId ? "Save changes" : "Add job"))}
      </button>
    </form>
  );
}

// ── MII order details ───────────────────────────────────────────────────────

type OrderDetailForm = Omit<
  MiiOrderDetailInput,
  "quantity" | "quantityCompleted" | "quotedMinutes" | "actualMinutes"
> & {
  quantity: string;
  quantityCompleted: string;
  quotedHours: string;
  actualHours: string;
};

const emptyOrderDetailForm: OrderDetailForm = {
  jobId: "",
  drawingNumber: "",
  drawingName: "",
  quantity: "",
  quantityCompleted: "",
  orderStatus: "Not Started",
  completed: false,
  completedDate: "",
  inspected: false,
  shipment: false,
  shipmentDate: "",
  remarks: "",
  quotedHours: "",
  actualHours: "",
};

type OrderDetailSheetProps = {
  /** The row being edited; null adds a new drawing. */
  editing: MiiOrderDetail | null;
  /** Job selected on a new drawing. */
  defaultJobId?: string | undefined;
  onClose: () => void;
  /** Called with the saved row's id once a new drawing has been stored. */
  onAdded?: ((id: string) => void) | undefined;
};

export function OrderDetailSheet({ open, ...props }: OrderDetailSheetProps & { open: boolean }) {
  return (
    <Sheet
      open={open}
      title={props.editing ? "Edit drawing" : "New drawing"}
      onClose={props.onClose}
    >
      <OrderDetailFormBody {...props} />
    </Sheet>
  );
}

export function OrderDetailFormBody({
  editing,
  defaultJobId,
  onClose,
  onAdded,
  submitLabel,
}: OrderDetailSheetProps & FormExtras) {
  const { jobs, machiningHours } = useStore();
  const editId = editing?.id ?? null;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<OrderDetailForm>(() => {
    if (!editing) return { ...emptyOrderDetailForm, jobId: defaultJobId ?? jobs[0]?.id ?? "" };
    const { id: _id, quotedMinutes, actualMinutes, ...detail } = editing;
    return {
      ...detail,
      quantity: String(detail.quantity),
      quantityCompleted: String(detail.quantityCompleted),
      quotedHours: quotedMinutes === null ? "" : formatDuration(quotedMinutes),
      actualHours: actualMinutes === null ? "" : formatDuration(actualMinutes),
    };
  });
  const [hoursError, setHoursError] = useState("");

  const formQuoted = parseDuration(form.quotedHours);
  const formActual = actualMinutesFor(form.jobId, form.drawingNumber.trim(), machiningHours);
  const formVariance = Number.isNaN(formQuoted) ? null : varianceOf(formQuoted, formActual);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const quotedMinutes = parseDuration(form.quotedHours);
    const actualMinutes = formActual;
    if (Number.isNaN(quotedMinutes)) {
      setHoursError("Enter hours as h:mm (e.g. 12:30) or decimal hours (e.g. 12.5).");
      return;
    }
    const { quotedHours: _q, actualHours: _a, ...rest } = form;
    const value: MiiOrderDetailInput = {
      ...rest,
      drawingNumber: form.drawingNumber.trim(),
      drawingName: form.drawingName.trim(),
      remarks: form.remarks.trim(),
      quantity: Number(form.quantity) || 0,
      quantityCompleted: Number(form.quantityCompleted) || 0,
      quotedMinutes,
      actualMinutes,
    };
    onClose();
    if (editId) {
      updateMiiOrderDetail(editId, value);
      return;
    }
    setBusy(true);
    const id = await addMiiOrderDetail(value);
    setBusy(false);
    if (id) onAdded?.(id);
  };

  // Switching Completed / Shipment on fills its date with today if it is empty.
  const setCompleted = (completed: boolean) =>
    setForm({
      ...form,
      completed,
      completedDate: completed && !form.completedDate ? today() : form.completedDate,
    });
  const setShipment = (shipment: boolean) =>
    setForm({
      ...form,
      shipment,
      shipmentDate: shipment && !form.shipmentDate ? today() : form.shipmentDate,
    });

  const switchRow = (
    id: string,
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <label
      htmlFor={id}
      className="flex w-full items-center justify-between rounded-xl bg-chip px-3 py-2.5"
    >
      <span className="text-sm font-medium">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );

  return (
    <form onSubmit={submit}>
      <label className={labelClass} htmlFor="mii-job">
        Job number
      </label>
      <div className="relative mb-4">
        <select
          id="mii-job"
          value={form.jobId}
          onChange={(event) => setForm({ ...form, jobId: event.target.value })}
          className={`${fieldClass} appearance-none pr-9`}
        >
          {jobs.length === 0 && <option value="">Add a job first</option>}
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.jobNumber || "(no job number)"}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
          ▾
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="mii-drawing-number">
            Drawing number
          </label>
          <input
            id="mii-drawing-number"
            required
            value={form.drawingNumber}
            onChange={(event) => setForm({ ...form, drawingNumber: event.target.value })}
            placeholder="e.g. DWG-2201"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="mii-drawing-name">
            Drawing name
          </label>
          <input
            id="mii-drawing-name"
            value={form.drawingName}
            onChange={(event) => setForm({ ...form, drawingName: event.target.value })}
            placeholder="e.g. Mounting bracket"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="mii-qty">
            Quantity
          </label>
          <input
            id="mii-qty"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="mii-qty-done">
            Quantity completed
          </label>
          <input
            id="mii-qty-done"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.quantityCompleted}
            onChange={(event) => setForm({ ...form, quantityCompleted: event.target.value })}
            className={fieldClass}
          />
        </div>
      </div>

      <label className={labelClass} htmlFor="mii-status">
        Order status
      </label>
      <select
        id="mii-status"
        value={form.orderStatus}
        onChange={(event) =>
          setForm({ ...form, orderStatus: event.target.value as MiiOrderStatus })
        }
        className={`${fieldClass} mb-4 font-semibold ${STATUS_SELECT_COLOR[form.orderStatus]}`}
      >
        {MII_ORDER_STATUSES.map((status) => (
          <option key={status} value={status} className={STATUS_COLOR[status]}>
            {status}
          </option>
        ))}
      </select>

      <div className="mb-4 flex flex-col gap-2">
        {switchRow("mii-completed", "Completed", form.completed, setCompleted)}
        {switchRow("mii-inspected", "Inspected", form.inspected, (inspected) =>
          setForm({ ...form, inspected }),
        )}
        {switchRow("mii-shipment", "Shipment", form.shipment, setShipment)}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="mii-completed-date">
            Completed date
          </label>
          <input
            id="mii-completed-date"
            type="date"
            value={form.completedDate}
            onChange={(event) => setForm({ ...form, completedDate: event.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="mii-shipment-date">
            Shipment date
          </label>
          <input
            id="mii-shipment-date"
            type="date"
            value={form.shipmentDate}
            onChange={(event) => setForm({ ...form, shipmentDate: event.target.value })}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="mii-quoted">
            Quoted hours
          </label>
          <input
            id="mii-quoted"
            value={form.quotedHours}
            onChange={(event) => setForm({ ...form, quotedHours: event.target.value })}
            placeholder="h:mm"
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div>
          <p className={labelClass}>Actual hours</p>
          <p
            className={`${fieldClass} flex items-center font-mono`}
            title="Sum of the machining hours logged for this job and drawing"
          >
            {formatDuration(formActual)}
          </p>
        </div>
      </div>
      <p className={`mb-4 text-[11px] ${hoursError ? "text-destructive" : "text-muted-fg"}`}>
        {hoursError || (
          <>
            Actual = machining hours logged · Variance (quoted − actual):{" "}
            <span className={`font-mono font-semibold ${varianceTone(formVariance)}`}>
              {formatVariance(formVariance)}
            </span>
          </>
        )}
      </p>

      <label className={labelClass} htmlFor="mii-remarks">
        Remarks
      </label>
      <textarea
        id="mii-remarks"
        rows={3}
        value={form.remarks}
        onChange={(event) => setForm({ ...form, remarks: event.target.value })}
        placeholder="Notes about this drawing…"
        className="mb-5 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none"
      />

      <button
        type="submit"
        disabled={busy}
        className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Saving…" : (submitLabel ?? (editId ? "Save changes" : "Add drawing"))}
      </button>
    </form>
  );
}

// ── Inspections ─────────────────────────────────────────────────────────────

type InspectionSheetProps = {
  /** The row being edited; null adds a new inspection. */
  editing: Inspection | null;
  /** Job and drawing (an MII order details row id) selected on a new inspection. */
  defaults?: { jobId?: string | undefined; drawingDetailId?: string | undefined } | undefined;
  onClose: () => void;
  /** Called once a new inspection has been added, with what it was recorded against. */
  onAdded?:
    | ((added: {
        id: string;
        jobId: string;
        drawingDetailId: string;
        drawingNumber: string | undefined;
      }) => void)
    | undefined;
};

export function InspectionSheet({ open, ...props }: InspectionSheetProps & { open: boolean }) {
  // Kept here so the sheet cannot be closed while documents are uploading.
  const [saving, setSaving] = useState(false);
  return (
    <Sheet
      open={open}
      title={props.editing ? "Edit inspection" : "New inspection"}
      onClose={() => {
        if (!saving) props.onClose();
      }}
    >
      <InspectionFormBody {...props} saving={saving} setSaving={setSaving} />
    </Sheet>
  );
}

export function InspectionFormBody({
  editing,
  defaults,
  onClose,
  onAdded,
  saving,
  setSaving,
  submitLabel,
}: InspectionSheetProps & UploadLock & FormExtras) {
  const { jobs, miiOrderDetails } = useStore();
  const editId = editing?.id ?? null;
  const [busy, setBusy] = useState(false);

  // An inspection's job and drawing are both MII order details rows.
  const detailById = (id: string) => miiOrderDetails.find((d) => d.id === id);
  // Only jobs with at least one order details row can be picked.
  const jobOptions = jobs.filter((j) => miiOrderDetails.some((d) => d.jobId === j.id));

  const startDetail = editing
    ? detailById(editing.drawingDetailId)
    : defaults?.drawingDetailId
      ? detailById(defaults.drawingDetailId)
      : undefined;
  const startJobId = editing
    ? ((detailById(editing.jobDetailId) ?? startDetail)?.jobId ?? "")
    : (startDetail?.jobId ??
      (jobOptions.some((j) => j.id === defaults?.jobId) ? (defaults?.jobId ?? "") : ""));

  const [jobId, setJobId] = useState(startJobId);
  const [drawingDetailId, setDrawingDetailId] = useState(startDetail?.id ?? "");
  const [keptDocs, setKeptDocs] = useState<string[]>(editing?.documents ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const drawingOptions = miiOrderDetails.filter((d) => d.jobId === jobId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || busy) return;
    if (keptDocs.length + newFiles.length === 0) {
      setError("Add at least one supporting document.");
      return;
    }
    setSaving(true);
    const uploaded = (await Promise.all(newFiles.map(uploadInspectionDocument))).filter(
      (path): path is string => path !== null,
    );
    setSaving(false);
    // Every file failed to upload (the store already showed the error).
    if (newFiles.length > 0 && uploaded.length === 0 && keptDocs.length === 0) return;

    const documents = [...keptDocs, ...uploaded];
    // The job is stored as an order details row: the chosen drawing's row, else one of the job's.
    const keepsJobRow = editing && detailById(editing.jobDetailId)?.jobId === jobId;
    const jobDetailId =
      drawingDetailId || (keepsJobRow ? editing.jobDetailId : (drawingOptions[0]?.id ?? ""));
    const value = { jobDetailId, drawingDetailId, documents };

    onClose();
    if (editing) {
      removeInspectionDocuments(editing.documents.filter((path) => !keptDocs.includes(path)));
      updateInspection(editing.id, value);
      return;
    }
    const added = {
      jobId,
      drawingDetailId,
      drawingNumber: detailById(drawingDetailId)?.drawingNumber || undefined,
    };
    setBusy(true);
    const id = await addInspection(value);
    setBusy(false);
    if (id) onAdded?.({ id, ...added });
  };

  return (
    <form onSubmit={submit}>
      <label className={labelClass} htmlFor="inspection-job">
        Job number
      </label>
      <select
        id="inspection-job"
        value={jobId}
        onChange={(event) => {
          setJobId(event.target.value);
          // A drawing belongs to a job, so clear it when the job changes.
          setDrawingDetailId("");
        }}
        className={`${fieldClass} mb-4`}
      >
        <option value="">
          {jobOptions.length === 0 ? "Add MII order details first" : "No job"}
        </option>
        {jobOptions.map((job) => (
          <option key={job.id} value={job.id}>
            {job.jobNumber || "(no job number)"}
          </option>
        ))}
      </select>

      <label className={labelClass} htmlFor="inspection-drawing">
        Drawing number
      </label>
      <select
        id="inspection-drawing"
        value={drawingDetailId}
        onChange={(event) => setDrawingDetailId(event.target.value)}
        disabled={!jobId}
        className={`${fieldClass} mb-4 disabled:opacity-60`}
      >
        <option value="">No drawing</option>
        {drawingOptions.map((detail) => (
          <option key={detail.id} value={detail.id}>
            {detail.drawingNumber || "(no drawing number)"}
            {detail.drawingName ? ` — ${detail.drawingName}` : ""}
          </option>
        ))}
      </select>

      <label className={labelClass} htmlFor="inspection-docs">
        Supporting documents
      </label>
      <input
        id="inspection-docs"
        type="file"
        multiple
        onChange={(event) => {
          setNewFiles(Array.from(event.target.files ?? []));
          setError("");
        }}
        className="mb-1 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line file:mr-3 file:rounded-lg file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-semibold"
      />
      <p className={`mb-2 text-[11px] ${error ? "text-destructive" : "text-muted-fg"}`}>
        {error ||
          (newFiles.length > 0
            ? `Selected: ${newFiles.map((file) => file.name).join(", ")}`
            : "Choose one or more files (PDF, images, reports…)")}
      </p>

      {keptDocs.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {keptDocs.map((path) => (
            <span
              key={path}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-chip py-1 pr-1 pl-2.5 text-[12px]"
            >
              <span className="truncate">{fileName(path)}</span>
              <button
                type="button"
                onClick={() => setKeptDocs(keptDocs.filter((p) => p !== path))}
                aria-label={`Remove ${fileName(path)}`}
                className="grid size-5 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 mb-5 text-[11px] text-muted-fg">
        {editing
          ? `Submitted ${formatSubmitted(editing.createdAt)}.`
          : "Submitted time is recorded when you upload."}
      </p>

      <button
        type="submit"
        disabled={saving || busy}
        className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {saving
          ? "Uploading…"
          : busy
            ? "Saving…"
            : (submitLabel ?? (editId ? "Save changes" : "Submit inspection"))}
      </button>
    </form>
  );
}

// ── Machining hours ─────────────────────────────────────────────────────────

type MachiningHourSheetProps = {
  /** The row being edited; null adds a new entry. */
  editing: MachiningHour | null;
  /** Job and drawing number selected on a new entry. */
  defaults?: { jobId?: string | undefined; drawingNumber?: string | undefined } | undefined;
  onClose: () => void;
};

export function MachiningHourSheet({
  open,
  ...props
}: MachiningHourSheetProps & { open: boolean }) {
  return (
    <Sheet
      open={open}
      title={props.editing ? "Edit machining entry" : "New machining entry"}
      onClose={props.onClose}
    >
      <MachiningHourFormBody {...props} />
    </Sheet>
  );
}

export function MachiningHourFormBody({
  editing,
  defaults,
  onClose,
  submitLabel,
}: MachiningHourSheetProps & FormExtras) {
  const { users, machines, jobs, miiOrderDetails } = useStore();
  const editId = editing?.id ?? null;
  const [form, setForm] = useState<MachiningHourInput>(() => {
    if (editing) {
      const { id: _id, ...entry } = editing;
      return entry;
    }
    return {
      date: today(),
      userId: users.find((u) => u.isActive)?.id ?? "",
      machineId: machines[0]?.id ?? "",
      description: "",
      jobId: defaults?.jobId ?? jobs[0]?.id ?? "",
      drawingNumber: defaults?.drawingNumber ?? "",
      durationMinutes: null,
      quantity: null,
    };
  });
  // Typed as text and converted on save: hours as h:mm or decimal, quantity as a number.
  const [hoursText, setHoursText] = useState(
    editing?.durationMinutes != null ? formatDuration(editing.durationMinutes) : "",
  );
  const [fieldError, setFieldError] = useState("");

  // Only active users can be picked, but keep a deactivated user selectable
  // when editing an entry that already has them.
  const userOptions = users.filter((u) => u.isActive || u.id === form.userId);

  // Drawing numbers from MII Order Details for a job (unique, non-blank).
  const drawingsForJob = (jobId: string) => [
    ...new Set(
      miiOrderDetails
        .filter((d) => d.jobId === jobId && d.drawingNumber)
        .map((d) => d.drawingNumber),
    ),
  ];
  // Keep an entry's saved drawing listed even if it was since removed from MII.
  const drawingOptions = [
    ...new Set([
      ...drawingsForJob(form.jobId),
      ...(form.drawingNumber ? [form.drawingNumber] : []),
    ]),
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date) return;
    const durationMinutes = parseDuration(hoursText);
    if (Number.isNaN(durationMinutes)) {
      setFieldError("Enter hours as h:mm (e.g. 7:30) or decimal hours (e.g. 7.5).");
      return;
    }
    const value: MachiningHourInput = {
      ...form,
      description: form.description.trim(),
      durationMinutes,
    };
    if (editId) updateMachiningHour(editId, value);
    else addMachiningHour(value);
    onClose();
  };

  const selectField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    emptyLabel: string,
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
          {options.length === 0 && <option value="">{emptyLabel}</option>}
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

  return (
    <form onSubmit={submit}>
      <label className={labelClass} htmlFor="mh-date">
        Date
      </label>
      <input
        id="mh-date"
        type="date"
        required
        value={form.date}
        onChange={(event) => setForm({ ...form, date: event.target.value })}
        className={`${fieldClass} mb-4`}
      />

      {selectField(
        "mh-user",
        "User",
        form.userId,
        (userId) => setForm({ ...form, userId }),
        userOptions.map((u) => ({
          value: u.id,
          label: u.isActive ? u.name : `${u.name} (inactive)`,
        })),
        "Add a user first",
      )}

      {selectField(
        "mh-machine",
        "Machine",
        form.machineId,
        (machineId) => setForm({ ...form, machineId }),
        machines.map((m) => ({ value: m.id, label: m.name })),
        "Add a machine first",
      )}

      <label className={labelClass} htmlFor="mh-description">
        Description
      </label>
      <textarea
        id="mh-description"
        rows={3}
        value={form.description}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
        placeholder="Setup, operation, part run…"
        className="mb-4 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none"
      />

      <label className={labelClass} htmlFor="mh-hours">
        Hours
      </label>
      <input
        id="mh-hours"
        value={hoursText}
        onChange={(event) => {
          setHoursText(event.target.value);
          setFieldError("");
        }}
        placeholder="h:mm or 7.5"
        className={`${fieldClass} mb-1 font-mono`}
      />
      <p className={`mb-4 text-[11px] ${fieldError ? "text-destructive" : "text-muted-fg"}`}>
        {fieldError || "Time worked on this entry, e.g. 7:30 or 7.5."}
      </p>

      {selectField(
        "mh-job",
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
        "Add a job first",
      )}

      <label className={labelClass} htmlFor="mh-drawing">
        Drawing number
      </label>
      <div className="relative mb-1">
        <select
          id="mh-drawing"
          value={form.drawingNumber}
          onChange={(event) => setForm({ ...form, drawingNumber: event.target.value })}
          className={`${fieldClass} appearance-none pr-9`}
        >
          <option value="">No drawing</option>
          {drawingOptions.map((drawing) => (
            <option key={drawing} value={drawing}>
              {drawing}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
          ▾
        </span>
      </div>
      <p className="mb-5 text-[11px] text-muted-fg">
        Drawings come from MII Order Details for the selected job.
      </p>

      <button
        type="submit"
        className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
      >
        {submitLabel ?? (editId ? "Save changes" : "Add entry")}
      </button>
    </form>
  );
}
