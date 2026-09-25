import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { AddButton, Sheet } from "@/components/Sheet";
import { addToolType, removeToolType, updateToolType, useStore } from "@/lib/store";

export const Route = createFileRoute("/tool-types")({
  head: () => ({
    meta: [
      { title: "Tool Types — TechPro Inventory Console" },
      { name: "description", content: "Create and manage the tool type categories used across TechPro inventory." },
      { property: "og:title", content: "Tool Types — TechPro Inventory Console" },
      { property: "og:description", content: "Create and manage tool type categories for TechPro inventory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ToolTypesPage,
});

function ToolTypesPage() {
  const { toolTypes, items } = useStore();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openNew = () => {
    setEditId(null);
    setName("");
    setOpen(true);
  };

  const openEdit = (id: string, currentName: string) => {
    setEditId(id);
    setName(currentName);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
    setName("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (editId) updateToolType(editId, value);
    else addToolType(value);
    closeSheet();
  };

  return (
    <Shell eyebrow="Tool Types" title="Categories & grouping" action={<AddButton label="Add tool type" onClick={openNew} />}>
      <Sheet open={open} title={editId ? "Edit tool type" : "New tool type"} onClose={closeSheet}>
        <form onSubmit={submit}>
          <label className={labelClass} htmlFor="tool-type">Item</label>
          <input id="tool-type" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Drilling Equipment" className={`${fieldClass} mb-5`} />
          <button type="submit" className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110">
            {editId ? "Save changes" : "Add tool type"}
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Tool types</h2>
            <span className="font-mono text-[12px] text-muted-fg">{toolTypes.length} types</span>
          </div>
          <div className="glass-surface divide-y divide-line overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            {toolTypes.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-fg">No tool types yet. Add your first one.</p>}
            {toolTypes.map((type) => {
              const count = items.filter((item) => item.typeId === type.id).length;
              return (
                <div key={type.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{type.name}</p>
                    <p className="font-mono text-[12px] text-muted-fg">{count} items</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(type.id, type.name)} aria-label={`Edit ${type.name}`} title="Edit" className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"><Pencil size={14} /></button>
                    <button onClick={() => removeToolType(type.id)} aria-label={`Remove ${type.name}`} title="Remove" className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}