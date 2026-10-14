import type { CompanyPriority, JobStatus, MiiOrderStatus } from "@/lib/store";

// Pill colors for company priority (Company page and Jobs New).
export const COMPANY_PRIORITY_COLOR: Record<CompanyPriority, string> = {
  Low: "bg-good-soft text-good",
  Modest: "bg-warn-soft text-warn",
  High: "bg-destructive/15 text-destructive",
};

// Pill colors for job statuses (Job table and job details page).
export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  "Not Started": "bg-chip text-muted-fg",
  "In Progress": "bg-warn-soft text-warn",
  "Partially Completed": "bg-warn-soft text-warn",
  Completed: "bg-good-soft text-good",
  Shipped: "bg-good-soft text-good",
  "Requires Attention": "bg-destructive/15 text-destructive",
  Mistake: "bg-destructive/15 text-destructive",
};

// Pill colors for the order statuses shared by MII Order Details and Jobs New.
export const ORDER_STATUS_COLOR: Record<MiiOrderStatus, string> = {
  "Not Started": "bg-chip text-muted-fg",
  "In Progress": "bg-sky-500/15 text-sky-500",
  Completed: "bg-good-soft text-good",
  Shipped: "bg-violet-500/15 text-violet-500",
  "Requires Attention": "bg-warn-soft text-warn",
  Mistake: "bg-destructive/15 text-destructive",
  "Partially Completed": "bg-amber-500/15 text-amber-500",
};

// Same colors with the important modifier, so they override glass-control's background on a select.
export const ORDER_STATUS_SELECT_COLOR: Record<MiiOrderStatus, string> = {
  "Not Started": "bg-chip! text-muted-fg",
  "In Progress": "bg-sky-500/15! text-sky-500",
  Completed: "bg-good-soft! text-good",
  Shipped: "bg-violet-500/15! text-violet-500",
  "Requires Attention": "bg-warn-soft! text-warn",
  Mistake: "bg-destructive/15! text-destructive",
  "Partially Completed": "bg-amber-500/15! text-amber-500",
};
