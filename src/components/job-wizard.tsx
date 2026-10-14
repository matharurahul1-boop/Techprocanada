import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sheet } from "@/components/Sheet";
import {
  InspectionFormBody,
  JobFormBody,
  MachiningHourFormBody,
  OrderDetailFormBody,
} from "@/components/job-sheets";
import { useStore } from "@/lib/store";

// The forms a new job goes through, in order, all inside one sheet.
const STEPS = [
  { key: "job", label: "Job" },
  { key: "detail", label: "Order details" },
  { key: "inspection", label: "Inspection" },
  { key: "machining", label: "Machining hours" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const arrowClass =
  "grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink disabled:pointer-events-none disabled:opacity-40";

export function JobWizardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Kept here so the sheet cannot be closed while files are uploading.
  const [saving, setSaving] = useState(false);
  return (
    <Sheet
      open={open}
      title="New job"
      wide
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <JobWizard saving={saving} setSaving={setSaving} onClose={onClose} />
    </Sheet>
  );
}

function JobWizard({
  saving,
  setSaving,
  onClose,
}: {
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onClose: () => void;
}) {
  const { jobs, miiOrderDetails, inspections } = useStore();
  const [step, setStep] = useState(0);
  // Which way the form slides in: 1 from the right (forward), -1 from the left (back).
  const [direction, setDirection] = useState<1 | -1>(1);
  // Id of the row each step has saved. Going back to a saved step edits that row.
  const [saved, setSaved] = useState<Record<StepKey, string | null>>({
    job: null,
    detail: null,
    inspection: null,
    machining: null,
  });

  const isSaved = (index: number) => {
    const key = STEPS[index]?.key;
    return key !== undefined && saved[key] !== null;
  };
  // A form opens up once the one before it has been filled in and saved.
  const unlocked = (index: number) =>
    index >= 0 && index < STEPS.length && (index === 0 || isSaved(index - 1));

  const show = (index: number) => {
    setDirection(index > step ? 1 : -1);
    setStep(index);
  };
  const go = (index: number) => {
    if (!saving && index !== step && unlocked(index)) show(index);
  };
  // A new row was stored: remember it and slide to the next form.
  const added = (key: StepKey, id: string) => {
    setSaved((current) => ({ ...current, [key]: id }));
    show(step + 1);
  };
  // An already-saved step was submitted again (an edit): move on once more.
  const resubmitted = (key: StepKey) => {
    if (saved[key] !== null) show(step + 1);
  };

  const job = jobs.find((j) => j.id === saved.job) ?? null;
  const detail = miiOrderDetails.find((d) => d.id === saved.detail) ?? null;
  const inspection = inspections.find((i) => i.id === saved.inspection) ?? null;

  const forms: Record<StepKey, ReactNode> = {
    job: (
      <JobFormBody
        editing={job}
        saving={saving}
        setSaving={setSaving}
        submitLabel="Save and continue"
        onClose={() => resubmitted("job")}
        onAdded={(id) => added("job", id)}
      />
    ),
    detail: (
      <OrderDetailFormBody
        editing={detail}
        defaultJobId={saved.job ?? undefined}
        submitLabel="Save and continue"
        onClose={() => resubmitted("detail")}
        onAdded={(id) => added("detail", id)}
      />
    ),
    inspection: (
      <InspectionFormBody
        editing={inspection}
        defaults={{ jobId: saved.job ?? undefined, drawingDetailId: saved.detail ?? undefined }}
        saving={saving}
        setSaving={setSaving}
        submitLabel="Save and continue"
        onClose={() => resubmitted("inspection")}
        onAdded={({ id }) => added("inspection", id)}
      />
    ),
    // The last form: saving it finishes the wizard.
    machining: (
      <MachiningHourFormBody
        editing={null}
        defaults={{
          jobId: saved.job ?? undefined,
          drawingNumber: detail?.drawingNumber || undefined,
        }}
        submitLabel="Save and finish"
        onClose={onClose}
      />
    ),
  };

  const current = STEPS[step] ?? STEPS[0];

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={saving || step === 0}
          aria-label="Previous form"
          title="Previous form"
          className={arrowClass}
        >
          <ArrowLeft size={14} />
        </button>
        <ol className="flex min-w-0 flex-1 items-center">
          {STEPS.map(({ key, label }, index) => (
            <li key={key} className="flex min-w-0 flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => go(index)}
                disabled={saving || !unlocked(index)}
                aria-current={index === step ? "step" : undefined}
                aria-label={`${label}${isSaved(index) ? " (saved)" : ""}`}
                title={label}
                className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ring-1 transition disabled:opacity-50 ${
                  index === step
                    ? "bg-accent-brand text-accent-brand-ink ring-accent-brand"
                    : isSaved(index)
                      ? "bg-good-soft text-good ring-transparent hover:ring-good"
                      : "bg-chip text-muted-fg ring-line"
                }`}
              >
                {isSaved(index) && index !== step ? <Check size={13} /> : index + 1}
              </button>
              {index < STEPS.length - 1 && (
                <span className={`mx-1.5 h-px flex-1 ${isSaved(index) ? "bg-good" : "bg-line"}`} />
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => go(step + 1)}
          disabled={saving || !unlocked(step + 1)}
          aria-label="Next form"
          title={unlocked(step + 1) ? "Next form" : "Save this form to unlock the next one"}
          className={arrowClass}
        >
          <ArrowRight size={14} />
        </button>
      </div>

      <p className="mb-4 text-[12px] text-muted-fg">
        Step {step + 1} of {STEPS.length} ·{" "}
        <span className="font-semibold text-ink">{current.label}</span>
        {isSaved(step) && <span className="text-good"> · saved, editing</span>}
      </p>

      {/* Remounted per step so each form slides in fresh. The slide is clipped (not
          scrolled, which would add a second scrollbar) and the padding keeps focus rings
          from being cut off. On desktop the form's fields flow into two columns so it
          fits without scrolling, with the submit button across the bottom. */}
      <div className="-mx-1 overflow-x-clip px-1">
        <div
          key={step}
          className={`animate-in fade-in duration-200 sm:[&>form]:columns-2 sm:[&>form]:gap-x-6 [&>form>*]:break-inside-avoid [&>form>button[type=submit]]:[column-span:all] [&>form>label]:break-after-avoid ${direction === 1 ? "slide-in-from-right-8" : "slide-in-from-left-8"}`}
        >
          {forms[current.key]}
        </div>
      </div>
    </>
  );
}
