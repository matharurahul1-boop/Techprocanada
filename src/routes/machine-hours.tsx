import { createFileRoute } from "@tanstack/react-router";
import { Search, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { AddButton, Sheet } from "@/components/Sheet";
import { Pagination } from "@/components/Pagination";
import { addMachineHour, removeMachineHour, useStore } from "@/lib/store";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/machine-hours")({
  head: () => ({
    meta: [
      { title: "Machining Hours — TechPro Inventory Console" },
      {
        name: "description",
        content: "Log machine run hours by job, operator and date for the Machining Hours report.",
      },
      { property: "og:title", content: "Machining Hours — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track machine hours logged per job and operator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MachineHoursPage,
});

const emptyForm = {
  machineId: "",
  operatorId: "",
  workDate: "",
  hours: "",
  jobNumber: "",
  notes: "",
};

function MachineHoursPage() {
  const { machines, users, machineHours } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? "Unassigned";
  const operatorName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unassigned";

  const filteredEntries = machineHours.filter((entry) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      machineName(entry.machineId).toLowerCase().includes(query) ||
      operatorName(entry.operatorId).toLowerCase().includes(query) ||
      entry.jobNumber.toLowerCase().includes(query)
    );
  });

  const totalHours = filteredEntries.reduce((sum, entry) => sum + entry.hours, 0);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);

  const openNew = () => {
    setForm({ ...emptyForm, machineId: machines[0]?.id ?? "", operatorId: users[0]?.id ?? "" });
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setForm(emptyForm);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedMachine = form.machineId || machines[0]?.id || "";
    const selectedOperator = form.operatorId || users[0]?.id || "";
    if (!selectedMachine || !form.workDate) return;
    addMachineHour({
      machineId: selectedMachine,
      operatorId: selectedOperator,
      workDate: form.workDate,
      hours: Number(form.hours) || 0,
      jobNumber: form.jobNumber.trim(),
      notes: form.notes.trim(),
    });
    closeSheet();
  };

  return (
    <Shell
      eyebrow="Machining Hours"
      title="Machine run log"
      action={<AddButton label="Log machine hours" onClick={openNew} />}
    >
      <Sheet open={open} title="Log machine hours" onClose={closeSheet}>
        <form onSubmit={submit}>
          <label className={labelClass} htmlFor="machine">
            Machine
          </label>
          <div className="relative mb-4">
            <select
              id="machine"
              value={form.machineId || machines[0]?.id || ""}
              onChange={(e) => setForm((current) => ({ ...current, machineId: e.target.value }))}
              className={`${fieldClass} appearance-none pr-9`}
            >
              {machines.length === 0 && <option value="">No machines yet</option>}
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
              ▾
            </span>
          </div>

          <label className={labelClass} htmlFor="operator">
            Operator
          </label>
          <div className="relative mb-4">
            <select
              id="operator"
              value={form.operatorId || users[0]?.id || ""}
              onChange={(e) => setForm((current) => ({ ...current, operatorId: e.target.value }))}
              className={`${fieldClass} appearance-none pr-9`}
            >
              {users.length === 0 && <option value="">Add a user first</option>}
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
              ▾
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="work-date">
                Date
              </label>
              <input
                id="work-date"
                type="date"
                required
                value={form.workDate}
                onChange={(e) => setForm((current) => ({ ...current, workDate: e.target.value }))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="hours">
                Hours
              </label>
              <input
                id="hours"
                type="number"
                min="0"
                step="0.25"
                value={form.hours}
                onChange={(e) => setForm((current) => ({ ...current, hours: e.target.value }))}
                className={fieldClass}
              />
            </div>
          </div>

          <label className={labelClass} htmlFor="job-number">
            Job Number
          </label>
          <input
            id="job-number"
            value={form.jobNumber}
            onChange={(e) => setForm((current) => ({ ...current, jobNumber: e.target.value }))}
            placeholder="e.g. JOB-1042"
            className={`${fieldClass} mb-4`}
          />

          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
            placeholder="Setup, downtime, part run…"
            className="mb-5 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none"
          />

          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            Save entry
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="font-display text-base font-semibold">Machine hours</h2>
            <span className="font-mono text-[11px] text-muted-fg sm:text-[12px]">
              {filteredEntries.length} entries · {totalHours.toFixed(2)} hrs
            </span>
          </div>

          <div className="glass-surface mb-3 flex items-center gap-2 rounded-xl border p-2">
            <label className="relative block flex-1">
              <span className="sr-only">Search machine hours</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search machine, operator or job #"
                className={`${fieldClass} pl-9`}
              />
            </label>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                title="Clear search"
                className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-fg transition hover:bg-chip hover:text-ink"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden items-center gap-4 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_6rem_8rem_3rem]">
              <span>Machine</span>
              <span>Operator</span>
              <span className="text-right">Date</span>
              <span className="text-right">Hours</span>
              <span>Job #</span>
              <span className="text-center">Delete</span>
            </div>

            <div className="divide-y divide-line">
              {filteredEntries.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-fg">
                  {machineHours.length === 0
                    ? "No machine hours logged yet."
                    : "No entries match this search."}
                </p>
              )}
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3.5 transition-colors hover:bg-panel/40 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem_6rem_8rem_3rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{machineName(entry.machineId)}</p>
                    <p className="truncate text-[12px] text-muted-fg lg:hidden">
                      {operatorName(entry.operatorId)}
                    </p>
                  </div>
                  <span className="hidden truncate text-[13px] text-muted-fg lg:block">
                    {operatorName(entry.operatorId)}
                  </span>
                  <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                    {entry.workDate}
                  </span>
                  <span className="hidden text-right font-mono text-[13px] font-semibold lg:block">
                    {entry.hours}
                  </span>
                  <span className="hidden truncate font-mono text-[12px] text-muted-fg lg:block">
                    {entry.jobNumber || "—"}
                  </span>

                  <div className="mt-2 flex items-center justify-between gap-3 lg:hidden">
                    <span className="font-mono text-[11px] text-muted-fg">
                      {entry.workDate} · <span className="text-ink">{entry.hours} hrs</span>
                      {entry.jobNumber ? ` · ${entry.jobNumber}` : ""}
                    </span>
                    <button
                      onClick={() => removeMachineHour(entry.id)}
                      aria-label={`Delete entry for ${machineName(entry.machineId)}`}
                      title="Delete"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => removeMachineHour(entry.id)}
                    aria-label={`Delete entry for ${machineName(entry.machineId)}`}
                    title="Delete"
                    className="hidden size-8 place-items-center justify-self-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn lg:grid"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={filteredEntries.length}
            pageSize={PAGE_SIZE}
            itemLabel="entries"
          />
        </section>
      </div>
    </Shell>
  );
}
