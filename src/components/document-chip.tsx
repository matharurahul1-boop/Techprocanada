import { FileText, X } from "lucide-react";

import { fileName } from "@/lib/job-format";

/**
 * Opens a private file in a new tab. The tab is opened straight away (so the browser
 * doesn't block it as a popup) and pointed at the signed link once it is ready.
 */
export async function openDocument(getUrl: () => Promise<string | null>) {
  const tab = window.open("", "_blank");
  const url = await getUrl();
  if (!url || !tab) {
    tab?.close();
    return;
  }
  // Files uploaded without a type come back as a "generic file", which the browser
  // downloads. Fetching it and labelling it by its extension lets PDFs, images and
  // text open in the tab. Types a browser can't display (Word, Excel) still download.
  const type = viewableType(url);
  if (!type) {
    tab.location.href = url;
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const blob = new Blob([await response.arrayBuffer()], { type });
    tab.location.href = URL.createObjectURL(blob);
  } catch {
    tab.location.href = url;
  }
}

const VIEWABLE: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
};

/** The type to show the file as, from the extension in its (signed) link; null if not viewable. */
function viewableType(url: string) {
  const path = decodeURIComponent(new URL(url).pathname);
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return VIEWABLE[extension] ?? null;
}

/**
 * A document in a table row: click the name to open it, × to delete it. Without
 * `onOpen` (e.g. an old entry that only has a file name) the name is shown as text.
 */
export function DocumentChip({
  path,
  onOpen,
  onDelete,
}: {
  path: string;
  onOpen?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
}) {
  const name = fileName(path);
  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-full bg-chip py-0.5 pr-0.5 pl-2 text-[12px]"
      onClick={(event) => event.stopPropagation()}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          title={`Open ${name}`}
          className="inline-flex min-w-0 items-center gap-1 text-accent-brand hover:underline"
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{name}</span>
        </button>
      ) : (
        <span
          className="inline-flex min-w-0 items-center gap-1 text-muted-fg"
          title="No file stored"
        >
          <FileText size={12} className="shrink-0" />
          <span className="truncate">{name}</span>
        </span>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${name}`}
          title="Delete document"
          className="grid size-5 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}
