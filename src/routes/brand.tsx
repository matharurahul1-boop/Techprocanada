import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { AddButton, Sheet } from "@/components/Sheet";
import { Pagination } from "@/components/Pagination";

import { addBrand, removeBrand, updateBrand, useStore } from "@/lib/store";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Maintain the list of tool and consumable brands used when recording TechPro purchase orders.",
      },
      { property: "og:title", content: "Brand — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Maintain the brand list used across TechPro tool orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandPage,
});

function BrandPage() {
  const { brands, orders } = useStore();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(brands.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleBrands = brands.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (editId) updateBrand(editId, value);
    else addBrand(value);
    closeSheet();
  };

  return (
    <Shell
      eyebrow="Brand"
      title="Suppliers & makes"
      action={<AddButton label="Add brand" onClick={openNew} />}
    >
      <Sheet open={open} title={editId ? "Edit brand" : "New brand"} onClose={closeSheet}>
        <form onSubmit={submit}>
          <label className={labelClass} htmlFor="brand-name">
            Brand
          </label>
          <input
            id="brand-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bosch"
            className={`${fieldClass} mb-5`}
          />
          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            {editId ? "Save changes" : "Add brand"}
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Brands</h2>
            <span className="font-mono text-[12px] text-muted-fg">{brands.length} brands</span>
          </div>

          <div className="glass-surface divide-y divide-line overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            {brands.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No brands yet. Add your first one.
              </p>
            )}
            {visibleBrands.map((brand) => {
              const count = orders.filter((o) => o.brandId === brand.id).length;
              return (
                <div
                  key={brand.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{brand.name}</p>
                    <p className="font-mono text-[12px] text-muted-fg">{count} orders</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(brand.id, brand.name)}
                      aria-label={`Edit ${brand.name}`}
                      title="Edit"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => removeBrand(brand.id)}
                      aria-label={`Remove ${brand.name}`}
                      title="Remove"
                      className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={brands.length}
            pageSize={PAGE_SIZE}
            itemLabel="brands"
          />
        </section>
      </div>
    </Shell>
  );
}
