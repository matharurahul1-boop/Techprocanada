import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Search, ShoppingCart, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { AddButton, Sheet, SideSheet } from "@/components/Sheet";
import { Pagination } from "@/components/Pagination";
import { EditAssignmentSheet, EditOrderSheet, LocationSelect } from "@/components/edit-sheets";

import {
  addAssignment,
  addItem,
  addOrder,
  balanceOf,
  removeAssignment,
  removeItem,
  removeOrder,
  updateItem,
  useStore,
  type InventoryItem,
} from "@/lib/store";

export const Route = createFileRoute("/inventory-items")({
  validateSearch: (search: Record<string, unknown>) => ({
    balance:
      search["balance"] === "below" || search["balance"] === "threshold" || search["balance"] === "above"
        ? (search["balance"] as "below" | "threshold" | "above")
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inventory Items — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Log tools and consumables with quantities ordered and issued, automatic balance, low-stock thresholds and essential flags.",
      },
      { property: "og:title", content: "Inventory Items — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Track tool quantities, balances, thresholds and essential items.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryItemsPage,
});

function InventoryItemsPage() {
  const { toolTypes, items, brands, orders, users, assignments, machines } = useStore();
  const routeSearch = Route.useSearch();
  const [orderItemId, setOrderItemId] = useState<string | null>(null);
  const [assignItemId, setAssignItemId] = useState<string | null>(null);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editAssignId, setEditAssignId] = useState<string | null>(null);
  const [issuedTo, setIssuedTo] = useState("");
  const [issuedFrom, setIssuedFrom] = useState<"Admin" | "HR">("Admin");
  const [issuedDate, setIssuedDate] = useState("");
  const [qtyIssued, setQtyIssued] = useState("");
  const [assignBrandId, setAssignBrandId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [drawingNumber, setDrawingNumber] = useState("");
  const [location, setLocation] = useState("");
  const [assignMachineId, setAssignMachineId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [brandId, setBrandId] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [amount, setAmount] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [returnable, setReturnable] = useState<"Returnable" | "Consumable">("Returnable");
  const [ordered, setOrdered] = useState("");
  const [issued, setIssued] = useState("");
  const [threshold, setThreshold] = useState("");
  const [essential, setEssential] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "below" | "threshold" | "above">(
    routeSearch.balance ?? "all",
  );
  const [page, setPage] = useState(1);


  const orderedNum = Number(ordered) || 0;
  const issuedNum = Number(issued) || 0;
  const balance = orderedNum - issuedNum;
  const selectedType = typeId || toolTypes[0]?.id || "";
  const attentionCount = items.filter((item) => balanceOf(item) <= item.threshold).length;
  const filteredItems = items.filter((item) => {
    const itemBalance = balanceOf(item);
    const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesType = filterTypeId === "all" || item.typeId === filterTypeId;
    const matchesBalance =
      balanceFilter === "all" ||
      (balanceFilter === "below" && itemBalance < item.threshold) ||
      (balanceFilter === "threshold" && itemBalance === item.threshold) ||
      (balanceFilter === "above" && itemBalance > item.threshold);
    return matchesSearch && matchesType && matchesBalance;
  });
  const filtersActive = search.trim() !== "" || filterTypeId !== "all" || balanceFilter !== "all";

  const PAGE_SIZE = 20;
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [search, filterTypeId, balanceFilter]);

  const resetForm = () => {
    setName("");
    setTypeId("");
    setReturnable("Returnable");
    setOrdered("");
    setIssued("");
    setThreshold("");
    setEssential(false);
  };

  const openNew = () => {
    setEditId(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setName(item.name);
    setTypeId(item.typeId);
    setReturnable(item.returnable);
    setOrdered(String(item.ordered));
    setIssued(String(item.issued));
    setThreshold(String(item.threshold));
    setEssential(item.essential);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setEditId(null);
    resetForm();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedType) return;
    const payload = {
      name: name.trim(),
      typeId: selectedType,
      returnable,
      ordered: orderedNum,
      issued: issuedNum,
      threshold: Number(threshold) || 0,
      essential,
    };
    if (editId) updateItem(editId, payload);
    else addItem(payload);
    closeSheet();
  };

  const typeName = (id: string) => toolTypes.find((t) => t.id === id)?.name ?? "Unassigned";
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "Unassigned";
  const machineName = (id: string) => machines.find((m) => m.id === id)?.name ?? "";

  const orderItem = items.find((i) => i.id === orderItemId) ?? null;
  const selectedBrand = brandId || brands[0]?.id || "";
  const itemOrders = orders.filter((o) => o.itemId === orderItemId);

  const openOrder = (id: string) => {
    setOrderItemId(id);
    setPurchaseDate("");
    setBrandId("");
    setOrderQty("");
    setAmount("");
    setDocumentName("");
  };

  const submitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderItemId || !selectedBrand || !purchaseDate) return;
    addOrder({
      itemId: orderItemId,
      purchaseDate,
      brandId: selectedBrand,
      qtyOrdered: Number(orderQty) || 0,
      amount: Number(amount) || 0,
      documentName,
    });
    setPurchaseDate("");
    setOrderQty("");
    setAmount("");
    setDocumentName("");
  };

  const assignItem = items.find((i) => i.id === assignItemId) ?? null;
  const selectedUser = issuedTo || users[0]?.id || "";
  const selectedAssignBrand = assignBrandId || brands[0]?.id || "";
  const itemAssignments = assignments.filter((a) => a.itemId === assignItemId);
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? "Unassigned";

  const openAssign = (id: string) => {
    setAssignItemId(id);
    setIssuedTo("");
    setIssuedFrom("Admin");
    setIssuedDate("");
    setQtyIssued("");
    setAssignBrandId("");
    setRemarks("");
    setJobNumber("");
    setDrawingNumber("");
    setLocation("");
    setAssignMachineId("");
  };

  const submitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignItemId || !selectedUser || !issuedDate) return;
    const notification = addAssignment({
      itemId: assignItemId,
      userId: selectedUser,
      issuedFrom,
      issuedDate,
      qtyIssued: Number(qtyIssued) || 0,
      brandId: selectedAssignBrand,
      remarks,
      jobNumber,
      drawingNumber,
      location,
      machineId: assignMachineId,
    });
    if (notification) {
      const isCritical = notification.level === "critical";
      toast(isCritical ? "Balance below threshold" : "Balance reached threshold", {
        description: `${notification.itemName}: ${notification.balance} remaining (threshold ${notification.threshold}).`,
        duration: 6000,
      });
    }
    setIssuedDate("");
    setQtyIssued("");
    setRemarks("");
    setJobNumber("");
    setDrawingNumber("");
    setLocation("");
    setAssignMachineId("");
  };

  return (
    <Shell
      eyebrow="Inventory Items"
      title="Stock & replenishment"
      action={<AddButton label="Add inventory item" onClick={openNew} />}
    >
      <Sheet open={open} title={editId ? "Edit item" : "New item"} onClose={closeSheet}>
          <form onSubmit={submit}>

            <label className={labelClass} htmlFor="tool-name">
              Tool name
            </label>
            <input
              id="tool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DeWalt 20V Impact Driver"
              className={`${fieldClass} mb-4`}
            />

            <label className={labelClass} htmlFor="tool-type">
              Tool type
            </label>
            <div className="relative mb-4">
              <select
                id="tool-type"
                value={selectedType}
                onChange={(e) => setTypeId(e.target.value)}
                className={`${fieldClass} appearance-none pr-9`}
              >
                {toolTypes.length === 0 && <option value="">Add a tool type first</option>}
                {toolTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
                ▾
              </span>
            </div>

            <label className={labelClass} htmlFor="returnable">
              Returnable
            </label>
            <div className="relative mb-4">
              <select
                id="returnable"
                value={returnable}
                onChange={(e) => setReturnable(e.target.value as "Returnable" | "Consumable")}
                className={`${fieldClass} appearance-none pr-9`}
              >
                <option value="Returnable">Returnable</option>
                <option value="Consumable">Consumable</option>
              </select>
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
                ▾
              </span>
            </div>

            <span className={labelClass}>Quantities (auto)</span>
            <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-canvas px-3 py-2.5 ring-1 ring-line">
              <div>
                <p className="font-mono text-[10px] tracking-wider text-muted-fg uppercase">
                  Ordered
                </p>
                <p className="font-mono text-sm font-medium">{orderedNum}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-wider text-muted-fg uppercase">
                  Issued
                </p>
                <p className="font-mono text-sm font-medium">{issuedNum}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-wider text-muted-fg uppercase">
                  Balance
                </p>
                <p className="font-mono text-sm font-medium">{balance}</p>
              </div>
            </div>
            <p className="mb-4 text-[11px] text-muted-fg">
              Ordered comes from Tools Order entries, issued from Tools Assigned entries.
            </p>

            <label className={labelClass} htmlFor="threshold">
              Threshold
            </label>
            <input
              id="threshold"
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={`${fieldClass} mb-4`}
            />

            <button
              type="button"
              onClick={() => setEssential((v) => !v)}
              aria-pressed={essential}
              className="mb-5 flex w-full items-center justify-between rounded-xl bg-chip px-3 py-2.5"
            >
              <span className="text-sm font-medium">Essentials</span>
              <span className="relative inline-flex h-6 w-11 items-center">
                <span
                  className={`absolute inset-0 rounded-full transition ${essential ? "bg-accent-brand" : "bg-line"}`}
                />
                <span
                  className={`relative size-5 rounded-full bg-panel shadow transition-all ${essential ? "ml-5" : "ml-0.5"}`}
                />
              </span>
            </button>

            <button
              type="submit"
              className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
            >
              {editId ? "Save changes" : "Add to inventory"}
            </button>
          </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">

          <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className="font-display text-base font-semibold">Inventory items</h2>
            <span className="font-mono text-[11px] text-muted-fg sm:text-[12px]">
              {filteredItems.length} of {items.length} items · {attentionCount} need attention
            </span>
          </div>

          <div className="glass-surface mb-3 flex flex-col gap-2 rounded-xl border p-2 sm:grid sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.55fr)_minmax(10rem,0.55fr)_auto]">
            <label className="relative block">
              <span className="sr-only">Search inventory items</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search items"
                className={`${fieldClass} pl-9`}
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <label className="relative block">
                <span className="sr-only">Filter by tool type</span>
                <select
                  value={filterTypeId}
                  onChange={(event) => setFilterTypeId(event.target.value)}
                  className={`${fieldClass} appearance-none pr-8 text-[13px] sm:pr-9 sm:text-sm`}
                >
                  <option value="all">All tool types</option>
                  {toolTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-fg sm:right-3">▾</span>
              </label>
              <label className="relative block">
                <span className="sr-only">Filter by balance</span>
                <select
                  value={balanceFilter}
                  onChange={(event) => setBalanceFilter(event.target.value as typeof balanceFilter)}
                  className={`${fieldClass} appearance-none pr-8 text-[13px] sm:pr-9 sm:text-sm`}
                >
                  <option value="all">All balances</option>
                  <option value="below">Below threshold</option>
                  <option value="threshold">At threshold</option>
                  <option value="above">Above threshold</option>
                </select>
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-fg sm:right-3">▾</span>
              </label>
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterTypeId("all");
                  setBalanceFilter("all");
                }}
                aria-label="Clear filters"
                title="Clear filters"
                className="flex h-10 items-center justify-center gap-1.5 rounded-lg text-muted-fg transition hover:bg-chip hover:text-ink sm:size-10 sm:self-center"
              >
                <X size={16} />
                <span className="text-[12px] font-medium sm:hidden">Clear filters</span>
              </button>
            )}
          </div>

          <div className="glass-surface overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            <div className="hidden items-center gap-4 border-b border-line px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid lg:grid-cols-[minmax(0,1fr)_repeat(4,4.5rem)_13rem]">
              <span>Item</span>
              <span className="text-right">Thr</span>
              <span className="text-right">Ordered</span>
              <span className="text-right">Issued</span>
              <span className="text-right">Balance</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-line">
              {filteredItems.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-fg">
                  {items.length === 0 ? "No items logged yet." : "No items match these filters."}
                </p>
              )}
              {visibleItems.map((item) => {
                const itemBalance = balanceOf(item);
                const balanceTone = itemBalance < item.threshold
                  ? "bg-destructive/15 text-destructive ring-destructive/25"
                  : itemBalance === item.threshold
                    ? "bg-warn-soft text-warn ring-warn/25"
                    : "bg-good-soft text-good ring-good/25";
                const dotTone = itemBalance < item.threshold
                  ? "bg-destructive"
                  : itemBalance === item.threshold
                    ? "bg-warn"
                    : "bg-good";
                return (
                  <div
                    key={item.id}
                    className="px-4 py-3.5 transition-colors hover:bg-panel/40 lg:grid lg:grid-cols-[minmax(0,1fr)_repeat(4,4.5rem)_13rem] lg:items-center lg:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.name}
                        {item.essential && (
                          <span className="ml-2 rounded-full bg-chip px-2 py-0.5 align-middle font-mono text-[10px] text-muted-fg">
                            essential
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[12px] text-muted-fg">
                        {typeName(item.typeId)} · {item.returnable}
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 lg:hidden">
                      <span className="font-mono text-[11px] text-muted-fg">
                        Thr {item.threshold}
                      </span>
                      <span className="font-mono text-[11px] text-muted-fg">
                        Ord <span className="text-ink">{item.ordered}</span>
                      </span>
                      <span className="font-mono text-[11px] text-muted-fg">
                        Iss <span className="text-ink">{item.issued}</span>
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ${balanceTone}`}>
                        <span className={`size-1.5 rounded-full ${dotTone}`} />
                        Bal {itemBalance}
                      </span>
                    </div>

                    <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                      {item.threshold}
                    </span>
                    <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                      {item.ordered}
                    </span>
                    <span className="hidden text-right font-mono text-[13px] text-muted-fg lg:block">
                      {item.issued}
                    </span>
                    <span className={`hidden items-center justify-self-end gap-1.5 rounded-full px-2.5 py-1 font-mono text-sm font-semibold ring-1 lg:inline-flex ${balanceTone}`}>
                      <span className={`size-1.5 rounded-full ${dotTone}`} />
                      {itemBalance}
                    </span>

                    <div className="mt-3 flex items-center justify-end gap-1.5 lg:mt-0 lg:justify-self-end">
                        <button
                          onClick={() => openOrder(item.id)}
                          aria-label={`Order ${item.name}`}
                          title="Order"
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                        >
                          <ShoppingCart size={14} />
                        </button>
                        <button
                          onClick={() => openAssign(item.id)}
                          aria-label={`Assign ${item.name}`}
                          title="Assign"
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                        >
                          <UserPlus size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
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
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={filteredItems.length}
            pageSize={PAGE_SIZE}
            itemLabel="items"
          />
        </section>
      </div>

      <SideSheet
        open={!!orderItem}
        title="Tools Order"
        subtitle={orderItem?.name}
        onClose={() => setOrderItemId(null)}
      >
        <form onSubmit={submitOrder}>
          <label className={labelClass} htmlFor="purchase-date">
            Date of purchase
          </label>
          <input
            id="purchase-date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={`${fieldClass} mb-4`}
          />

          <label className={labelClass} htmlFor="order-brand">
            Brand
          </label>
          <div className="relative mb-4">
            <select
              id="order-brand"
              value={selectedBrand}
              onChange={(e) => setBrandId(e.target.value)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              {brands.length === 0 && <option value="">Add a brand first</option>}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
              ▾
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="order-qty">
                Qty ordered
              </label>
              <input
                id="order-qty"
                type="number"
                min="0"
                value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="order-amount">
                Amount
              </label>
              <input
                id="order-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <label className={labelClass} htmlFor="order-doc">
            Document
          </label>
          <input
            id="order-doc"
            type="file"
            onChange={(e) => setDocumentName(e.target.files?.[0]?.name ?? "")}
            className="mb-1 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line file:mr-3 file:rounded-lg file:border-0 file:bg-chip file:px-3 file:py-1.5 file:text-[12px] file:font-semibold"
          />
          <p className="mb-5 text-[11px] text-muted-fg">
            {documentName ? `Selected: ${documentName}` : "PDF, image or invoice file"}
          </p>

          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            Save order
          </button>
        </form>

        {itemOrders.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 font-mono text-[11px] tracking-[0.18em] text-muted-fg uppercase">
              Orders
            </p>
            <div className="divide-y divide-line overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
              {itemOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {brandName(o.brandId)} · {o.qtyOrdered} qty
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-fg">
                      {o.purchaseDate} · {o.amount.toFixed(2)}
                      {o.documentName ? ` · ${o.documentName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditOrderId(o.id)}
                      aria-label="Edit order"
                      title="Edit"
                      className="grid size-8 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removeOrder(o.id)}
                      aria-label="Remove order"
                      title="Remove"
                      className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SideSheet>

      <SideSheet
        open={!!assignItem}
        title="Tools Assigned"
        subtitle={assignItem?.name}
        onClose={() => setAssignItemId(null)}
      >
        <form onSubmit={submitAssign}>
          <label className={labelClass} htmlFor="issued-to">
            Issued To
          </label>
          <div className="relative mb-4">
            <select
              id="issued-to"
              value={selectedUser}
              onChange={(e) => setIssuedTo(e.target.value)}
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

          <label className={labelClass} htmlFor="issued-from">
            Issued From
          </label>
          <div className="relative mb-4">
            <select
              id="issued-from"
              value={issuedFrom}
              onChange={(e) => setIssuedFrom(e.target.value as "Admin" | "HR")}
              className={`${fieldClass} appearance-none pr-9`}
            >
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
              ▾
            </span>
          </div>

          <label className={labelClass} htmlFor="assign-location">
            Location
          </label>
          <LocationSelect id="assign-location" value={location} onChange={setLocation} />

          <label className={labelClass} htmlFor="assign-machine">
            Machine
          </label>
          <div className="relative mb-4">
            <select
              id="assign-machine"
              value={assignMachineId}
              onChange={(e) => setAssignMachineId(e.target.value)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              <option value="">No machine</option>
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

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="issued-date">
                Issued Date
              </label>
              <input
                id="issued-date"
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="qty-issued">
                Qty Issued
              </label>
              <input
                id="qty-issued"
                type="number"
                min="0"
                value={qtyIssued}
                onChange={(e) => setQtyIssued(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <label className={labelClass} htmlFor="assign-brand">
            Brand
          </label>
          <div className="relative mb-4">
            <select
              id="assign-brand"
              value={selectedAssignBrand}
              onChange={(e) => setAssignBrandId(e.target.value)}
              className={`${fieldClass} appearance-none pr-9`}
            >
              {brands.length === 0 && <option value="">Add a brand first</option>}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-fg">
              ▾
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="job-number">
                Job Number
              </label>
              <input
                id="job-number"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="e.g. JOB-1042"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="drawing-number">
                Drawing Number
              </label>
              <input
                id="drawing-number"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                placeholder="e.g. DWG-77B"
                className={fieldClass}
              />
            </div>
          </div>

          <label className={labelClass} htmlFor="remarks">
            Remarks
          </label>
          <textarea
            id="remarks"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Condition, site notes, return expectations…"
            className="mb-5 w-full rounded-xl bg-panel px-3 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-accent-brand focus:outline-none"
          />

          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            Save assignment
          </button>
        </form>

        {itemAssignments.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 font-mono text-[11px] tracking-[0.18em] text-muted-fg uppercase">
              Assignments
            </p>
            <div className="divide-y divide-line overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
              {itemAssignments.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {userName(a.userId)} · {a.qtyIssued} qty
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-fg">
                      {a.issuedDate} · {a.issuedFrom} · {brandName(a.brandId)}
                    </p>
                    {(a.jobNumber || a.drawingNumber) && (
                      <p className="truncate font-mono text-[11px] text-muted-fg">
                        {a.jobNumber}
                        {a.jobNumber && a.drawingNumber ? " · " : ""}
                        {a.drawingNumber}
                      </p>
                    )}
                    {(a.location || a.machineId) && (
                      <p className="truncate font-mono text-[11px] text-muted-fg">
                        {a.location}
                        {a.location && a.machineId ? " · " : ""}
                        {machineName(a.machineId)}
                      </p>
                    )}
                    {a.remarks && (
                      <p className="text-[11px] text-muted-fg">{a.remarks}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditAssignId(a.id)}
                      aria-label="Edit assignment"
                      title="Edit"
                      className="grid size-8 place-items-center rounded-full bg-chip text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removeAssignment(a.id)}
                      aria-label="Remove assignment"
                      title="Remove"
                      className="grid size-8 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SideSheet>

      <EditOrderSheet order={orders.find((o) => o.id === editOrderId) ?? null} onClose={() => setEditOrderId(null)} />
      <EditAssignmentSheet assignment={assignments.find((a) => a.id === editAssignId) ?? null} onClose={() => setEditAssignId(null)} />
    </Shell>
  );
}
