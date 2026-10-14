import { Link } from "@tanstack/react-router";
import { ShipWheel, type LucideIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type WheelSpoke = {
  /** Tab of the job details page this spoke opens. */
  tab: "orders" | "inspections" | "machining";
  label: string;
  /** Short label that fits inside the round button. */
  short: string;
  icon: LucideIcon;
  count: number;
  /** MII order details row id, to open the tab narrowed to one drawing. */
  drawing?: string | undefined;
};

// Distance of the spoke buttons from the wheel's centre, in rem.
const RADIUS = 4.6;

// Spokes are spread evenly round the hub: two sit left and right, three start at the top.
const spot = (index: number, total: number) => {
  const angle = ((total === 2 ? 180 : -90) + (360 / total) * index) * (Math.PI / 180);
  return {
    left: `calc(50% + ${(Math.cos(angle) * RADIUS).toFixed(2)}rem)`,
    top: `calc(50% + ${(Math.sin(angle) * RADIUS).toFixed(2)}rem)`,
  };
};

/**
 * Wheel menu for a table row: a button that opens a round popup with the row in the
 * hub and its sub-tables around it. Every target is the job details page, on the
 * spoke's tab; the hub opens the job itself.
 */
export function JobWheel({
  jobId,
  hubLabel,
  hubText,
  spokes,
  triggerLabel,
}: {
  /** Job whose details page the wheel opens; blank disables the wheel. */
  jobId: string;
  /** Small caption in the hub, e.g. "Job" or "Drawing". */
  hubLabel: string;
  hubText: string;
  spokes: readonly WheelSpoke[];
  triggerLabel: string;
}) {
  const triggerClass =
    "grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink data-[state=open]:bg-accent-brand data-[state=open]:text-accent-brand-ink";

  if (!jobId) {
    return (
      <span
        title="Not linked to a job"
        className={`${triggerClass} pointer-events-none opacity-40`}
      >
        <ShipWheel size={15} />
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label={triggerLabel} title="Tables" className={triggerClass}>
          <ShipWheel size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-auto rounded-full border-0 bg-transparent p-0 shadow-none"
      >
        <div className="glass-surface relative size-60 rounded-full border shadow-2xl shadow-accent-brand/20">
          <span className="absolute top-1/2 left-1/2 size-[9.2rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line" />
          <Link
            to="/job/$jobId"
            params={{ jobId }}
            title="Open job"
            className="brand-gradient absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-accent-brand-ink shadow-lg shadow-accent-brand/30 transition hover:scale-105 hover:brightness-110"
          >
            <span className="text-[8px] leading-none font-bold tracking-[0.14em] uppercase opacity-80">
              {hubLabel}
            </span>
            <span className="mt-0.5 max-w-12 truncate font-mono text-[11px] leading-tight font-bold">
              {hubText || "—"}
            </span>
          </Link>
          {spokes.map(({ tab, label, short, icon: Icon, count, drawing }, index) => (
            <Link
              key={tab}
              to="/job/$jobId"
              params={{ jobId }}
              search={{ tab, drawing }}
              title={`${label} (${count})`}
              style={spot(index, spokes.length)}
              className="absolute flex size-[4.75rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full bg-chip text-ink ring-1 ring-line transition hover:scale-105 hover:bg-accent-brand hover:text-accent-brand-ink hover:ring-accent-brand focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none"
            >
              <Icon size={18} />
              <span className="text-[9.5px] leading-none font-semibold">{short}</span>
              <span
                className={`absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-panel px-1 font-mono text-[10px] font-bold ring-1 ring-line ${count === 0 ? "text-muted-fg" : "text-accent-brand"}`}
              >
                {count}
              </span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
