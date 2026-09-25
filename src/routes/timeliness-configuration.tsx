import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Download, FileText, Loader2, Pencil, Trash2, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { AddButton, Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui/button";
import {
  addTimelinessConfiguration,
  removeTimelinessConfiguration,
  updateTimelinessConfiguration,
  useStore,
  type TimelinessConfiguration,
} from "@/lib/store";
import { generateReportNow, getReportDownloadUrl, listReports } from "@/lib/reports/actions.functions";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/timeliness-configuration")({
  head: () => ({
    meta: [
      { title: "Timeliness Configuration — TechPro Inventory Console" },
      {
        name: "description",
        content: "Configure report schedules, submission days, and responsible users for TechPro.",
      },
      { property: "og:title", content: "Timeliness Configuration — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Configure recurring report submission schedules for TechPro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TimelinessConfigurationPage,
});

const reportTables: TimelinessConfiguration["reportTable"][] = [
  "Inventory Assigned",
  "Inventory Orders",
  "Machining Hours",
  "Inventory Items",
];
const frequencies: TimelinessConfiguration["frequency"][] = ["Weekly", "Monthly", "Quarterly"];
const submissionDays: TimelinessConfiguration["submissionDay"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyForm = {
  reportName: "",
  reportTable: "Inventory Assigned" as TimelinessConfiguration["reportTable"],
  frequency: "Weekly" as TimelinessConfiguration["frequency"],
  submissionDay: "Monday" as TimelinessConfiguration["submissionDay"],
  submittedByUserId: "",
};

function TimelinessConfigurationPage() {
  const { timelinessConfigurations, users } = useStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [reports, setReports] = useState<Tables<"generated_reports">[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const refreshReports = () => {
    setReportsLoading(true);
    listReports({ data: {} })
      .then((rows) => setReports(rows))
      .catch((error: unknown) => {
        console.error(error);
        toast.error("Could not load recent reports.");
      })
      .finally(() => setReportsLoading(false));
  };

  useEffect(() => {
    refreshReports();
  }, []);

  const generateNow = async (configuration: TimelinessConfiguration) => {
    setGeneratingId(configuration.id);
    try {
      await generateReportNow({ data: { configurationId: Number(configuration.id) } });
      toast.success(`Report generated for "${configuration.reportName}".`);
      refreshReports();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report.");
    } finally {
      setGeneratingId(null);
    }
  };

  const download = async (report: Tables<"generated_reports">) => {
    try {
      const url = await getReportDownloadUrl({ data: { storagePath: report.storage_path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not open report.");
    }
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, submittedByUserId: users[0]?.id ?? "" });
    setOpen(true);
  };

  const openEdit = (configuration: TimelinessConfiguration) => {
    setEditId(configuration.id);
    setForm({
      reportName: configuration.reportName,
      reportTable: configuration.reportTable,
      frequency: configuration.frequency,
      submissionDay: configuration.submissionDay,
      submittedByUserId: configuration.submittedByUserId,
    });
    setOpen(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reportName = form.reportName.trim();
    if (!reportName || !form.submittedByUserId) return;
    const configuration = { ...form, reportName };
    if (editId) updateTimelinessConfiguration(editId, configuration);
    else addTimelinessConfiguration(configuration);
    closeSheet();
  };

  return (
    <Shell
      eyebrow="Reports"
      title="Timeliness Configuration"
      action={<AddButton label="Add report configuration" onClick={openNew} />}
    >
      <Sheet
        open={open}
        title={editId ? "Edit report configuration" : "New report configuration"}
        onClose={closeSheet}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="report-name">Report Name</label>
            <input
              id="report-name"
              autoFocus
              required
              value={form.reportName}
              onChange={(event) => setForm((current) => ({ ...current, reportName: event.target.value }))}
              placeholder="e.g. Weekly inventory summary"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="report-table">Report Table</label>
            <select
              id="report-table"
              value={form.reportTable}
              onChange={(event) => setForm((current) => ({ ...current, reportTable: event.target.value as TimelinessConfiguration["reportTable"] }))}
              className={fieldClass}
            >
              {reportTables.map((table) => <option key={table}>{table}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="frequency">Frequency</label>
              <select
                id="frequency"
                value={form.frequency}
                onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as TimelinessConfiguration["frequency"] }))}
                className={fieldClass}
              >
                {frequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="submission-day">Day of Submission</label>
              <select
                id="submission-day"
                value={form.submissionDay}
                onChange={(event) => setForm((current) => ({ ...current, submissionDay: event.target.value as TimelinessConfiguration["submissionDay"] }))}
                className={fieldClass}
              >
                {submissionDays.map((day) => <option key={day}>{day}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="submitted-by">Submitted By</label>
            <select
              id="submitted-by"
              required
              value={form.submittedByUserId}
              onChange={(event) => setForm((current) => ({ ...current, submittedByUserId: event.target.value }))}
              className={fieldClass}
            >
              <option value="" disabled>Select a user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </div>
          <Button type="submit" className="brand-gradient h-11 w-full rounded-xl text-accent-brand-ink shadow-lg shadow-accent-brand/20 hover:brightness-110">
            {editId ? "Save changes" : "Add configuration"}
          </Button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="font-display text-base font-semibold">Report schedules</h2>
            <span className="shrink-0 font-mono text-[12px] text-muted-fg">
              {timelinessConfigurations.length} configured
            </span>
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            {timelinessConfigurations.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CalendarDays className="mx-auto mb-3 size-6 text-accent-brand" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">No report schedules yet</p>
                <p className="mt-1 text-xs text-muted-fg">Add the first report and choose when it should be submitted.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {timelinessConfigurations.map((configuration) => {
                  const submitter = users.find((user) => user.id === configuration.submittedByUserId);
                  return (
                    <article key={configuration.id} className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_auto] sm:items-center lg:px-5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{configuration.reportName}</p>
                        <p className="mt-1 text-xs text-muted-fg">{configuration.reportTable}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:block">
                        <span className="text-muted-fg sm:block">Schedule</span>
                        <span className="font-mono font-bold text-ink">{configuration.frequency} · {configuration.submissionDay}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-xs">
                        <UserRound className="size-4 shrink-0 text-accent-brand" aria-hidden="true" />
                        <span className="truncate font-semibold text-ink">{submitter?.name ?? "User unavailable"}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void generateNow(configuration)}
                          disabled={generatingId === configuration.id}
                          aria-label={`Generate report now for ${configuration.reportName}`}
                          title="Generate report now"
                          className="size-8 rounded-full bg-chip text-ink hover:bg-accent-brand hover:text-accent-brand-ink"
                        >
                          {generatingId === configuration.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <FileText size={14} />
                          )}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(configuration)} aria-label={`Edit ${configuration.reportName}`} title="Edit" className="size-8 rounded-full bg-chip text-ink hover:bg-accent-brand hover:text-accent-brand-ink">
                          <Pencil size={14} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTimelinessConfiguration(configuration.id)} aria-label={`Remove ${configuration.reportName}`} title="Remove" className="size-8 rounded-full text-muted-fg hover:bg-warn-soft hover:text-warn">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="font-display text-base font-semibold">Recent reports</h2>
            <span className="shrink-0 font-mono text-[12px] text-muted-fg">
              {reportsLoading ? "Loading…" : `${reports.length} generated`}
            </span>
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            {reports.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FileText className="mx-auto mb-3 size-6 text-accent-brand" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">
                  {reportsLoading ? "Loading recent reports…" : "No reports generated yet"}
                </p>
                {!reportsLoading && (
                  <p className="mt-1 text-xs text-muted-fg">
                    Use the report icon on a schedule above to generate one now.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-line">
                {reports.map((report) => {
                  const configuration = timelinessConfigurations.find(
                    (entry) => entry.id === String(report.configuration_id),
                  );
                  return (
                    <article
                      key={report.id}
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(9rem,0.8fr)_auto] sm:items-center lg:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">
                          {configuration?.reportName ?? report.report_table}
                        </p>
                        <p className="mt-1 text-xs text-muted-fg">
                          {report.report_table} · {report.row_count} rows
                        </p>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-fg sm:block">Period</span>
                        <span className="font-mono font-bold text-ink">
                          {report.period_start} → {report.period_end}
                        </span>
                      </div>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void download(report)}
                          className="gap-1.5 rounded-full bg-chip text-ink hover:bg-accent-brand hover:text-accent-brand-ink"
                        >
                          <Download size={14} />
                          Download
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}