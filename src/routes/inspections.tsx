import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Pencil, Trash2 } from "lucide-react";

import { Shell } from "@/components/Shell";
import { TableTransfer } from "@/components/table-transfer";
import { AddButton } from "@/components/Sheet";
import { DataList } from "@/components/DataList";
import { useConfirmDelete } from "@/components/confirm-delete";
import {
  FilterBanner,
  MachiningHoursLink,
  searchFlag,
  searchText,
  useOpenOnAdd,
} from "@/components/drill-down";
import { InspectionSheet } from "@/components/job-sheets";
import {
  getInspectionDocumentUrl,
  removeInspection,
  removeInspectionDocuments,
  updateInspection,
  useStore,
  type Inspection,
} from "@/lib/store";
import { DocumentChip, openDocument } from "@/components/document-chip";
import { fileName, formatSubmitted } from "@/lib/job-format";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/inspections")({
  // ?drawing=<order details id> shows only that drawing's inspections and ?job=<job id>
  // only that job's; ?add opens the new-inspection form (after a drawing was added).
  validateSearch: (
    search: Record<string, unknown>,
  ): { job?: string | undefined; drawing?: string | undefined; add?: boolean | undefined } => ({
    job: searchText(search["job"]),
    drawing: searchText(search["drawing"]),
    add: searchFlag(search["add"]),
  }),
  head: () => ({
    meta: [
      { title: "Inspections — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Upload inspection supporting documents per job and drawing, and see when each was submitted.",
      },
      { property: "og:title", content: "Inspections — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Inspection documents in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InspectionsPage,
});

function InspectionsPage() {
  const { inspections, jobs, miiOrderDetails } = useStore();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { job: jobFilter, drawing: drawingFilter, add } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { confirmDelete, confirmDialog } = useConfirmDelete();

  const editing = editId ? inspections.find((i) => i.id === editId) : undefined;

  // An inspection's job and drawing are both MII order details rows.
  const detailById = (id: string) => miiOrderDetails.find((d) => d.id === id);
  const jobNumber = (i: Inspection) => {
    const detail = detailById(i.jobDetailId) ?? detailById(i.drawingDetailId);
    return jobs.find((j) => j.id === detail?.jobId)?.jobNumber || "—";
  };
  const drawingNumber = (i: Inspection) => detailById(i.drawingDetailId)?.drawingNumber || "—";

  const jobIdOf = (i: Inspection) =>
    (detailById(i.jobDetailId) ?? detailById(i.drawingDetailId))?.jobId;
  const filterDetail = drawingFilter ? detailById(drawingFilter) : undefined;
  const rows = inspections.filter(
    (i) =>
      (!drawingFilter || i.drawingDetailId === drawingFilter) &&
      (!jobFilter || jobIdOf(i) === jobFilter),
  );

  // Job and drawing number to open Machining Hours with; null when the inspection has no job.
  const machiningSearch = (i: Inspection) => {
    const job = jobIdOf(i);
    const drawing = detailById(i.drawingDetailId)?.drawingNumber || undefined;
    return job ? { job, drawing } : null;
  };

  const openNew = () => {
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (inspection: Inspection) => {
    setEditId(inspection.id);
    setOpen(true);
  };

  useOpenOnAdd(add, openNew, () =>
    navigate({ search: (prev) => ({ ...prev, add: undefined }), replace: true }),
  );

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
  };

  // Each document opens on click; × deletes that file from the inspection.
  const documentLinks = (inspection: Inspection) => (
    <div className="flex flex-wrap gap-1.5">
      {inspection.documents.map((path) => (
        <DocumentChip
          key={path}
          path={path}
          onOpen={() => void openDocument(() => getInspectionDocumentUrl(path))}
          onDelete={() =>
            confirmDelete({
              title: "Delete this document?",
              description:
                "The file is removed from the inspection. The inspection itself is kept.",
              onConfirm: () => {
                removeInspectionDocuments([path]);
                updateInspection(inspection.id, {
                  jobDetailId: inspection.jobDetailId,
                  drawingDetailId: inspection.drawingDetailId,
                  documents: inspection.documents.filter((p) => p !== path),
                });
              },
            })
          }
        />
      ))}
    </div>
  );

  const rowActions = (inspection: Inspection) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <MachiningHoursLink search={machiningSearch(inspection)} />
      <button
        onClick={() => openEdit(inspection)}
        aria-label="Edit inspection"
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() =>
          confirmDelete({
            title: "Delete this inspection?",
            description: "Its supporting documents will be deleted too.",
            onConfirm: () => removeInspection(inspection.id),
          })
        }
        aria-label="Remove inspection"
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const transfer = (
    <TableTransfer
      name="inspections"
      label="inspections"
      rows={rows}
      columns={[
        { header: "Job number", value: (i) => jobNumber(i) },
        { header: "Drawing number", value: (i) => drawingNumber(i) },
        {
          header: "Supporting documents",
          value: (i) => i.documents.map(fileName).join(", "),
          width: 50,
        },
        { header: "Submitted at", value: (i) => formatSubmitted(i.createdAt), width: 24 },
      ]}
    />
  );

  return (
    <Shell
      eyebrow="Job · Inspections"
      title="Inspections"
      action={<AddButton label="Add inspection" onClick={openNew} />}
    >
      {/* A new inspection starts on the job / drawing this page is filtered to; once it
          is saved, the next step is logging machining hours for it. */}
      <InspectionSheet
        open={open}
        editing={editing ?? null}
        defaults={{ jobId: jobFilter, drawingDetailId: drawingFilter }}
        onClose={closeSheet}
        onAdded={({ jobId, drawingNumber }) => {
          if (!jobId) return;
          navigate({
            to: "/machining-hours",
            search: { job: jobId, drawing: drawingNumber, add: true },
          });
        }}
      />

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Inspections</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">{rows.length} submissions</span>
            </div>
          </div>

          {(jobFilter || drawingFilter) && (
            <FilterBanner
              label={[
                `Job ${jobs.find((j) => j.id === (filterDetail?.jobId ?? jobFilter))?.jobNumber || "—"}`,
                drawingFilter ? `Drawing ${filterDetail?.drawingNumber || "—"}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              onClear={() => navigate({ search: {} })}
            />
          )}

          <DataList
            searchable
            rows={rows}
            pagination={{
              page,
              onPageChange: setPage,
              pageSize: PAGE_SIZE,
              itemLabel: "submissions",
            }}
            rowKey={(inspection) => inspection.id}
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No inspections yet. Upload your first supporting documents.
              </p>
            }
            columns={[
              {
                header: "Job number",
                filter: "select",
                width: "7rem",
                sortValue: (i) => jobNumber(i),
                cell: (i) => <span className="font-mono text-[12px]">{jobNumber(i)}</span>,
              },
              {
                header: "Drawing number",
                width: "8rem",
                sortValue: (i) => drawingNumber(i),
                cell: (i) => (
                  <span className="font-mono text-[12px] font-semibold">{drawingNumber(i)}</span>
                ),
              },
              {
                header: "Supporting documents",
                width: "minmax(0,1fr)",
                sortValue: (i) => i.documents.length,
                cell: documentLinks,
              },
              {
                header: "Submitted at",
                width: "11rem",
                sortValue: (i) => i.createdAt ?? "",
                cell: (i) => (
                  <span className="font-mono text-[12px] text-muted-fg">
                    {formatSubmitted(i.createdAt)}
                  </span>
                ),
              },
              { header: "Action", width: "7.5rem", align: "right", cell: rowActions },
            ]}
            card={(i) => (
              <>
                <p className="mb-2 truncate font-mono text-[12px] text-muted-fg">
                  Job <span className="text-ink">{jobNumber(i)}</span> · Dwg{" "}
                  <span className="text-ink">{drawingNumber(i)}</span>
                </p>
                {documentLinks(i)}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-muted-fg">
                    Submitted {formatSubmitted(i.createdAt)}
                  </span>
                  {rowActions(i)}
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
