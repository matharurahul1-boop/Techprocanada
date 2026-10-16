import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useState } from "react";

import { Shell, fieldClass } from "@/components/Shell";
import { useStore } from "@/lib/store";

type Cell = { quoted: number; actual: number };

export const Route = createFileRoute("/variance-report")({
  head: () => ({
    meta: [
      { title: "Efficiency Analysis — TechPro Inventory Console" },
      {
        name: "description",
        content: "Quoted against actual machining hours, per job, drawing and machine.",
      },
    ],
  }),
  component: VarianceReportPage,
});

const hours = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 });

/**
 * Job variance report (from the old system): for every job and drawing, the quoted hours
 * (Quoted Hours) against the actual hours (Machining Hours) on each machine, as
 * quoted − actual. Green = within the quote, red = over it.
 */
function VarianceReportPage() {
  const { quotedHours, machiningHours, jobs, machines } = useStore();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");

  const jobNumber = (id: string) => jobs.find((j) => j.id === id)?.jobNumber || "No job";
  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? "";

  // job number -> drawing number -> machine id -> quoted / actual hours
  const matrix = new Map<string, Map<string, Map<string, Cell>>>();
  const add = (
    jobId: string,
    drawingNumber: string,
    machineId: string,
    kind: keyof Cell,
    value: number,
  ) => {
    if (!machineId || !machineName(machineId)) return;
    const job = jobNumber(jobId);
    if (search && !job.toLowerCase().includes(search.toLowerCase())) return;
    const drawing = drawingNumber || "No drawing";
    const drawings = matrix.get(job) ?? new Map<string, Map<string, Cell>>();
    matrix.set(job, drawings);
    const cells = drawings.get(drawing) ?? new Map<string, Cell>();
    drawings.set(drawing, cells);
    const cell = cells.get(machineId) ?? { quoted: 0, actual: 0 };
    cell[kind] += value;
    cells.set(machineId, cell);
  };
  for (const q of quotedHours) add(q.jobId, q.drawingNumber, q.machineId, "quoted", q.jobHours);
  for (const m of machiningHours) {
    if (m.durationMinutes != null) {
      add(m.jobId, m.drawingNumber, m.machineId, "actual", m.durationMinutes / 60);
    }
  }

  // Machines that appear in either quotes or machining hours, by name.
  const machineIds = [
    ...new Set([...quotedHours.map((q) => q.machineId), ...machiningHours.map((m) => m.machineId)]),
  ]
    .filter((id) => id && machineName(id))
    .sort((a, b) => machineName(a).localeCompare(machineName(b)));

  const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
  const jobRows = [...matrix.entries()].sort(([a], [b]) => byName(a, b));

  const apply = () => setSearch(searchText.trim());
  const reset = () => {
    setSearchText("");
    setSearch("");
  };

  const stickyJob = "sticky left-0 z-10 w-36 min-w-36 bg-panel";
  const stickyDrawing = "sticky left-36 z-10 w-44 min-w-44 bg-panel";

  // Quoted − actual for one cell, and its colour: only once some actual hours exist.
  const measure = (cell: Cell) => {
    const diff = cell.quoted - cell.actual;
    const tone =
      cell.actual > 0
        ? diff >= 0
          ? "bg-good-soft text-good"
          : "bg-destructive/15 text-destructive"
        : "";
    return { diff, tone };
  };
  const hasData = (cell: Cell | undefined): cell is Cell =>
    !!cell && (cell.quoted !== 0 || cell.actual !== 0);
  const diffText = (diff: number) => `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`;
  const emptyText = search ? "No jobs match that search." : "No quoted or machining hours yet.";

  return (
    <Shell eyebrow="Job · Job variance report" title="Efficiency Analysis">
      <div className="animate-rise space-y-4 px-5 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-[12px] text-muted-fg">
            Quoted − actual hours per machine.{" "}
            <span className="font-semibold text-good">Green</span> = within the quote,{" "}
            <span className="font-semibold text-destructive">red</span> = over it.
          </p>
          <form
            className="flex w-full items-center gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search job number…"
              aria-label="Search job number"
              className={`${fieldClass} h-9! min-w-0 flex-1 text-[13px] sm:w-48 sm:flex-none`}
            />
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-brand px-3 text-[12px] font-semibold text-accent-brand-ink transition hover:brightness-110"
            >
              <Search size={13} /> Search
            </button>
            {search && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-chip px-3 text-[12px] font-semibold text-ink transition hover:text-accent-brand"
              >
                <X size={13} /> Reset
              </button>
            )}
          </form>
        </div>

        {/* Phones and small tablets: one card per job, listing only the machines with hours. */}
        <div className="space-y-3 md:hidden">
          {jobRows.length === 0 ? (
            <p className="glass-surface rounded-2xl border p-8 text-center text-[13px] text-muted-fg">
              {emptyText}
            </p>
          ) : (
            jobRows.map(([job, drawings]) => {
              const drawingRows = [...drawings.entries()].sort(([a], [b]) => byName(a, b));
              return (
                <section
                  key={job}
                  className="glass-surface rounded-2xl border p-3 shadow-sm"
                  aria-label={`Job ${job}`}
                >
                  <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                    <p className="font-mono text-sm font-semibold">{job}</p>
                    <p className="text-[11px] text-muted-fg">
                      {drawingRows.length} drawing{drawingRows.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {drawingRows.map(([drawing, cells]) => {
                      const used = machineIds.filter((id) => hasData(cells.get(id)));
                      return (
                        <div key={drawing} className="rounded-xl bg-chip/50 p-2.5">
                          <p className="mb-2 truncate font-mono text-[12px] text-muted-fg">
                            {drawing}
                          </p>
                          {used.length === 0 ? (
                            <p className="text-[12px] text-muted-fg">No hours on any machine.</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {used.map((id) => {
                                const cell = cells.get(id) as Cell;
                                const { diff, tone } = measure(cell);
                                return (
                                  <div
                                    key={id}
                                    className={`min-w-0 rounded-lg px-2.5 py-2 ring-1 ring-line/60 ${tone || "bg-panel"}`}
                                  >
                                    <p className="truncate text-[11px] font-semibold text-ink">
                                      {machineName(id)}
                                    </p>
                                    <p className="font-mono text-[14px] font-bold">
                                      {diffText(diff)}
                                      <span className="ml-0.5 text-[10px] font-normal opacity-70">
                                        Hrs
                                      </span>
                                    </p>
                                    <p className="text-[10px] text-muted-fg">
                                      Q:{hours.format(cell.quoted)} / A:{hours.format(cell.actual)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <div className="glass-surface hidden max-h-[75vh] overflow-auto rounded-2xl border shadow-xl shadow-accent-brand/5 md:block">
          <table className="w-full min-w-[60rem] border-separate border-spacing-0 text-[12px]">
            <thead>
              <tr>
                <th
                  className={`${stickyJob} top-0 z-20 border-b border-line px-3 py-2.5 text-left font-semibold`}
                >
                  Job number
                </th>
                <th
                  className={`${stickyDrawing} top-0 z-20 border-r border-b border-line px-3 py-2.5 text-left font-semibold`}
                >
                  Drawing number
                </th>
                {machineIds.map((id) => (
                  <th
                    key={id}
                    className="sticky top-0 z-10 min-w-28 border-b border-line bg-panel px-2 py-2.5 text-center font-semibold"
                  >
                    {machineName(id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobRows.length === 0 ? (
                <tr>
                  <td colSpan={2 + machineIds.length} className="p-10 text-center text-muted-fg">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                jobRows.flatMap(([job, drawings]) => {
                  const drawingRows = [...drawings.entries()].sort(([a], [b]) => byName(a, b));
                  return drawingRows.map(([drawing, cells], index) => (
                    <tr key={`${job}|${drawing}`}>
                      {index === 0 && (
                        <td
                          rowSpan={drawingRows.length}
                          className={`${stickyJob} border-t-2 border-line px-3 py-2 align-top font-mono font-semibold`}
                        >
                          {job}
                        </td>
                      )}
                      <td
                        className={`${stickyDrawing} border-r border-line px-3 py-2 font-mono text-muted-fg ${index === 0 ? "border-t-2" : "border-t"}`}
                      >
                        {drawing}
                      </td>
                      {machineIds.map((id) => {
                        const cell = cells.get(id);
                        const border =
                          index === 0 ? "border-t-2 border-line" : "border-t border-line";
                        if (!hasData(cell)) {
                          return (
                            <td
                              key={id}
                              className={`${border} px-2 py-2 text-center text-muted-fg`}
                            >
                              –
                            </td>
                          );
                        }
                        const { diff, tone } = measure(cell);
                        return (
                          <td key={id} className={`${border} px-2 py-1.5 text-center ${tone}`}>
                            <span className="block font-mono text-[13px] font-bold">
                              {diffText(diff)}
                              <span className="ml-0.5 text-[10px] font-normal opacity-70">Hrs</span>
                            </span>
                            <span className="block text-[10px] text-muted-fg">
                              Q:{hours.format(cell.quoted)} / A:{hours.format(cell.actual)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
