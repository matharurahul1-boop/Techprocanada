import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { ImportError, TableTransfer } from "@/components/table-transfer";
import { cellOption } from "@/lib/excel";
import { useConfirmDelete } from "@/components/confirm-delete";
import { AddButton, Sheet } from "@/components/Sheet";
import { DataList } from "@/components/DataList";
import { COMPANY_PRIORITY_COLOR } from "@/lib/order-status";
import {
  addCompany,
  removeCompany,
  updateCompany,
  useStore,
  type Company,
  type CompanyInput,
  type CompanyPriority,
} from "@/lib/store";

const PAGE_SIZE = 20;

const PRIORITIES: CompanyPriority[] = ["Low", "Modest", "High"];

const PRIORITY_COLOR = COMPANY_PRIORITY_COLOR;

// Important modifier so the color overrides glass-control's background on the select.
const PRIORITY_SELECT_COLOR: Record<CompanyPriority, string> = {
  Low: "bg-good-soft! text-good",
  Modest: "bg-warn-soft! text-warn",
  High: "bg-destructive/15! text-destructive",
};

const emptyForm: CompanyInput = { name: "", priority: "Low", address: "", contactNumber: "" };

export const Route = createFileRoute("/company")({
  head: () => ({
    meta: [
      { title: "Company — TechPro Inventory Console" },
      {
        name: "description",
        content: "Maintain the company list used in the TechPro inventory console.",
      },
      { property: "og:title", content: "Company — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Maintain companies in the TechPro inventory console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { companies } = useStore();
  const { confirmDelete, confirmDialog } = useConfirmDelete();
  const [form, setForm] = useState<CompanyInput>(emptyForm);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditId(company.id);
    setForm({
      name: company.name,
      priority: company.priority ?? "Low",
      address: company.address ?? "",
      contactNumber: company.contactNumber ?? "",
    });
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value: CompanyInput = {
      name: form.name.trim(),
      priority: form.priority,
      address: form.address.trim(),
      contactNumber: form.contactNumber.trim(),
    };
    if (!value.name) return;
    if (editId) updateCompany(editId, value);
    else addCompany(value);
    closeSheet();
  };

  const priorityPill = (company: Company) => (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_COLOR[company.priority ?? "Low"]}`}
    >
      {company.priority ?? "Low"}
    </span>
  );

  const rowActions = (company: Company) => (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <button
        onClick={() => openEdit(company)}
        aria-label={`Edit ${company.name}`}
        title="Edit"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() =>
          confirmDelete({
            title: `Delete ${company.name}?`,
            description: "Jobs linked to this company are kept but lose their company.",
            onConfirm: () => removeCompany(company.id),
          })
        }
        aria-label={`Remove ${company.name}`}
        title="Remove"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const transfer = (
    <TableTransfer
      name="companies"
      label="companies"
      rows={companies}
      columns={[
        { header: "Company", value: (company) => company.name, width: 28 },
        { header: "Priority", value: (company) => company.priority ?? "Low" },
        { header: "Address", value: (company) => company.address ?? "", width: 36 },
        { header: "Contact number", value: (company) => company.contactNumber ?? "" },
      ]}
      parse={({ get }): CompanyInput => {
        const name = get("Company");
        if (!name) throw new ImportError("no company name");
        return {
          name,
          priority: cellOption(get("Priority"), PRIORITIES) ?? "Low",
          address: get("Address"),
          contactNumber: get("Contact number"),
        };
      }}
      add={addCompany}
    />
  );

  return (
    <Shell
      eyebrow="Job · Company"
      title="Companies"
      action={<AddButton label="Add company" onClick={openNew} />}
    >
      <Sheet open={open} title={editId ? "Edit company" : "New company"} onClose={closeSheet}>
        <form onSubmit={submit}>
          <label className={labelClass} htmlFor="company-name">
            Company
          </label>
          <input
            id="company-name"
            autoFocus
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. TechPro Canada"
            className={`${fieldClass} mb-4`}
          />
          <label className={labelClass} htmlFor="company-priority">
            Priority
          </label>
          <select
            id="company-priority"
            value={form.priority}
            onChange={(event) =>
              setForm({ ...form, priority: event.target.value as CompanyPriority })
            }
            className={`${fieldClass} mb-4 font-semibold ${PRIORITY_SELECT_COLOR[form.priority]}`}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority} className={PRIORITY_COLOR[priority]}>
                {priority}
              </option>
            ))}
          </select>
          <label className={labelClass} htmlFor="company-address">
            Address
          </label>
          <input
            id="company-address"
            type="text"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="e.g. 123 King St W, Toronto, ON"
            className={`${fieldClass} mb-4`}
          />
          <label className={labelClass} htmlFor="company-contact-number">
            Contact Number
          </label>
          <input
            id="company-contact-number"
            type="text"
            value={form.contactNumber}
            onChange={(event) => setForm({ ...form, contactNumber: event.target.value })}
            placeholder="e.g. +1 416 000 0000"
            className={`${fieldClass} mb-5`}
          />
          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            {editId ? "Save changes" : "Add company"}
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Companies</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {transfer}
              <span className="font-mono text-[12px] text-muted-fg">
                {companies.length} companies
              </span>
            </div>
          </div>

          <DataList
            rows={companies}
            pagination={{
              page,
              onPageChange: setPage,
              pageSize: PAGE_SIZE,
              itemLabel: "companies",
            }}
            rowKey={(company) => company.id}
            empty={
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No companies yet. Add your first one.
              </p>
            }
            columns={[
              {
                header: "Company",
                sortValue: (company) => company.name,
                width: "minmax(10rem,1fr)",
                cell: (company) => <p className="truncate text-sm font-semibold">{company.name}</p>,
              },
              {
                header: "Priority",
                sortValue: (company) =>
                  ["Low", "Modest", "High"].indexOf(company.priority ?? "Low"),
                width: "6rem",
                cell: (company) => priorityPill(company),
              },
              {
                header: "Address",
                sortValue: (company) => company.address,
                width: "minmax(10rem,1.4fr)",
                cell: (company) => (
                  <p className="truncate text-[13px] text-muted-fg">{company.address || "—"}</p>
                ),
              },
              {
                header: "Contact number",
                sortValue: (company) => company.contactNumber,
                width: "9rem",
                cell: (company) => (
                  <p className="truncate font-mono text-[12px] text-muted-fg">
                    {company.contactNumber || "—"}
                  </p>
                ),
              },
              { header: "Action", width: "5rem", align: "right", cell: rowActions },
            ]}
            card={(company) => (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold">{company.name}</p>
                  {priorityPill(company)}
                </div>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div className="min-w-0 text-[12px] text-muted-fg">
                    <p className="truncate">{company.address || "No address"}</p>
                    <p className="truncate font-mono">
                      {company.contactNumber || "No contact number"}
                    </p>
                  </div>
                  {rowActions(company)}
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
