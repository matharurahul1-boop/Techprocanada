import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { fieldClass, labelClass } from "@/components/Shell";
import { Sheet, SideSheet } from "@/components/Sheet";
import {
  updateAssignment,
  updateMachineHour,
  updateOrder,
  useStore,
  type MachineHour,
  type ToolAssignment,
  type ToolOrder,
} from "@/lib/store";

const submitClass =
  "brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110";
const textareaClass =
  "mb-5 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none";

export const formatDate = (value: string) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export function DetailSheet({
  open,
  title,
  subtitle,
  onClose,
  rows,
  actions,
}: {
  open: boolean;
  title: string;
  subtitle?: string | undefined;
  onClose: () => void;
  rows: [string, ReactNode][];
  actions?: ReactNode;
}) {
  return (
    <SideSheet open={open} title={title} subtitle={subtitle} onClose={onClose}>
      <dl className="divide-y divide-line overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-3 py-2.5">
            <dt className="font-mono text-[10px] tracking-wider text-muted-fg uppercase">{label}</dt>
            <dd className="min-w-0 text-[13px] font-medium break-words whitespace-pre-wrap">
              {value === "" || value == null ? "—" : value}
            </dd>
          </div>
        ))}
      </dl>
      {actions && <div className="mt-4 flex items-center gap-2">{actions}</div>}
    </SideSheet>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <div className="relative mb-4">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} appearance-none pr-9`}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
          ▾
        </span>
      </div>
    </>
  );
}

export function EditOrderSheet({
  order,
  onClose,
}: {
  order: ToolOrder | null;
  onClose: () => void;
}) {
  const { brands, items } = useStore();
  const [form, setForm] = useState({ purchaseDate: "", brandId: "", qty: "", amount: "", documentName: "" });

  useEffect(() => {
    if (!order) return;
    setForm({
      purchaseDate: order.purchaseDate,
      brandId: order.brandId,
      qty: String(order.qtyOrdered),
      amount: String(order.amount),
      documentName: order.documentName,
    });
  }, [order]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!order || !form.purchaseDate) return;
    updateOrder(order.id, {
      purchaseDate: form.purchaseDate,
      brandId: form.brandId,
      qtyOrdered: Number(form.qty) || 0,
      amount: Number(form.amount) || 0,
      documentName: form.documentName,
    });
    onClose();
  };

  return (
    <Sheet open={!!order} title="Edit order" onClose={onClose}>
      <p className="mb-4 truncate text-[12px] text-muted-fg">
        {items.find((i) => i.id === order?.itemId)?.name ?? "Removed item"}
      </p>
      <form onSubmit={submit}>
        <label className={labelClass} htmlFor="edit-order-date">
          Date of purchase
        </label>
        <input
          id="edit-order-date"
          type="date"
          value={form.purchaseDate}
          onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
          className={`${fieldClass} mb-4`}
        />
        <SelectField
          id="edit-order-brand"
          label="Brand"
          value={form.brandId}
          onChange={(brandId) => setForm((f) => ({ ...f, brandId }))}
        >
          <option value="">No brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectField>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-order-qty">
              Qty ordered
            </label>
            <input
              id="edit-order-qty"
              type="number"
              min="0"
              value={form.qty}
              onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-order-amount">
              Amount
            </label>
            <input
              id="edit-order-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={fieldClass}
            />
          </div>
        </div>
        <label className={labelClass} htmlFor="edit-order-doc">
          Document
        </label>
        <input
          id="edit-order-doc"
          type="file"
          onChange={(e) =>
            setForm((f) => ({ ...f, documentName: e.target.files?.[0]?.name ?? f.documentName }))
          }
          className="mb-1 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line file:mr-3 file:rounded-lg file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-semibold"
        />
        <p className="mb-5 text-[11px] text-muted-fg">
          {form.documentName ? `Current: ${form.documentName}` : "PDF, image or invoice file"}
        </p>
        <button type="submit" className={submitClass}>
          Save changes
        </button>
      </form>
    </Sheet>
  );
}

export function EditAssignmentSheet({
  assignment,
  onClose,
}: {
  assignment: ToolAssignment | null;
  onClose: () => void;
}) {
  const { users, brands, machines, items } = useStore();
  const [form, setForm] = useState({
    userId: "",
    issuedDate: "",
    qty: "",
    brandId: "",
    location: "",
    machineId: "",
    jobNumber: "",
    drawingNumber: "",
    remarks: "",
  });

  useEffect(() => {
    if (!assignment) return;
    setForm({
      userId: assignment.userId,
      issuedDate: assignment.issuedDate,
      qty: String(assignment.qtyIssued),
      brandId: assignment.brandId,
      location: assignment.location,
      machineId: assignment.machineId,
      jobNumber: assignment.jobNumber,
      drawingNumber: assignment.drawingNumber,
      remarks: assignment.remarks,
    });
  }, [assignment]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!assignment || !form.issuedDate) return;
    updateAssignment(assignment.id, {
      userId: form.userId,
      issuedDate: form.issuedDate,
      qtyIssued: Number(form.qty) || 0,
      brandId: form.brandId,
      location: form.location.trim(),
      machineId: form.machineId,
      jobNumber: form.jobNumber.trim(),
      drawingNumber: form.drawingNumber.trim(),
      remarks: form.remarks.trim(),
    });
    onClose();
  };

  return (
    <SideSheet
      open={!!assignment}
      title="Edit assignment"
      subtitle={items.find((i) => i.id === assignment?.itemId)?.name}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <SelectField id="edit-assign-user" label="Issued To" value={form.userId} onChange={set("userId")}>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectField>

        <label className={labelClass} htmlFor="edit-assign-location">
          Location
        </label>
        <input
          id="edit-assign-location"
          value={form.location}
          onChange={(e) => set("location")(e.target.value)}
          placeholder="e.g. BonHill Location (Welding)"
          className={`${fieldClass} mb-4`}
        />

        <SelectField id="edit-assign-machine" label="Machine" value={form.machineId} onChange={set("machineId")}>
          <option value="">No machine</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-assign-date">
              Issued Date
            </label>
            <input
              id="edit-assign-date"
              type="date"
              value={form.issuedDate}
              onChange={(e) => set("issuedDate")(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-assign-qty">
              Qty Issued
            </label>
            <input
              id="edit-assign-qty"
              type="number"
              min="0"
              value={form.qty}
              onChange={(e) => set("qty")(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <SelectField id="edit-assign-brand" label="Brand" value={form.brandId} onChange={set("brandId")}>
          <option value="">No brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectField>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-assign-job">
              Job Number
            </label>
            <input
              id="edit-assign-job"
              value={form.jobNumber}
              onChange={(e) => set("jobNumber")(e.target.value)}
              placeholder="e.g. JOB-1042"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-assign-drawing">
              Drawing Number
            </label>
            <input
              id="edit-assign-drawing"
              value={form.drawingNumber}
              onChange={(e) => set("drawingNumber")(e.target.value)}
              placeholder="e.g. DWG-77B"
              className={fieldClass}
            />
          </div>
        </div>

        <label className={labelClass} htmlFor="edit-assign-remarks">
          Remarks
        </label>
        <textarea
          id="edit-assign-remarks"
          rows={3}
          value={form.remarks}
          onChange={(e) => set("remarks")(e.target.value)}
          className={textareaClass}
        />

        <button type="submit" className={submitClass}>
          Save changes
        </button>
      </form>
    </SideSheet>
  );
}

export function EditMachineHourSheet({
  entry,
  onClose,
}: {
  entry: MachineHour | null;
  onClose: () => void;
}) {
  const { machines, users } = useStore();
  const [form, setForm] = useState({
    machineId: "",
    operatorId: "",
    workDate: "",
    hours: "",
    jobNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (!entry) return;
    setForm({
      machineId: entry.machineId,
      operatorId: entry.operatorId,
      workDate: entry.workDate,
      hours: String(entry.hours),
      jobNumber: entry.jobNumber,
      notes: entry.notes,
    });
  }, [entry]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!entry || !form.machineId || !form.workDate) return;
    updateMachineHour(entry.id, {
      machineId: form.machineId,
      operatorId: form.operatorId,
      workDate: form.workDate,
      hours: Number(form.hours) || 0,
      jobNumber: form.jobNumber.trim(),
      notes: form.notes.trim(),
    });
    onClose();
  };

  return (
    <Sheet open={!!entry} title="Edit machine hours" onClose={onClose}>
      <form onSubmit={submit}>
        <SelectField id="edit-mh-machine" label="Machine" value={form.machineId} onChange={set("machineId")}>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <SelectField id="edit-mh-operator" label="Operator" value={form.operatorId} onChange={set("operatorId")}>
          <option value="">No operator</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectField>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="edit-mh-date">
              Date
            </label>
            <input
              id="edit-mh-date"
              type="date"
              required
              value={form.workDate}
              onChange={(e) => set("workDate")(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-mh-hours">
              Hours
            </label>
            <input
              id="edit-mh-hours"
              type="number"
              min="0"
              step="0.25"
              value={form.hours}
              onChange={(e) => set("hours")(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <label className={labelClass} htmlFor="edit-mh-job">
          Job Number
        </label>
        <input
          id="edit-mh-job"
          value={form.jobNumber}
          onChange={(e) => set("jobNumber")(e.target.value)}
          className={`${fieldClass} mb-4`}
        />
        <label className={labelClass} htmlFor="edit-mh-notes">
          Notes
        </label>
        <textarea
          id="edit-mh-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes")(e.target.value)}
          className={textareaClass}
        />
        <button type="submit" className={submitClass}>
          Save changes
        </button>
      </form>
    </Sheet>
  );
}
