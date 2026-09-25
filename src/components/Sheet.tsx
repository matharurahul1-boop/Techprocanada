import { useEffect, type ReactNode } from "react";

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="brand-gradient grid size-10 shrink-0 place-items-center rounded-full text-xl leading-none font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/30 transition hover:brightness-110 active:scale-95"
    >
      +
    </button>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
      />
      <div className="glass-surface animate-rise relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-accent-brand/15 sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-chip text-sm text-muted-fg transition hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SideSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string | undefined;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-sheet-overlay"
      />
      <div className="glass-surface animate-flip-in-right relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-accent-brand/15 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-3xl sm:pb-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold">{title}</h2>
            {subtitle && <p className="truncate text-[12px] text-muted-fg">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-chip text-sm text-muted-fg transition hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
