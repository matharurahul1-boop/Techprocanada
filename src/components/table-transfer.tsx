import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportExcel, readExcel, type ExcelColumn, type ExcelRecord } from "@/lib/excel";

const buttonClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-chip px-3 text-[12px] font-semibold text-ink transition hover:bg-accent-brand hover:text-accent-brand-ink disabled:pointer-events-none disabled:opacity-50";

/** Thrown by `parse` to skip a row with a reason, e.g. `throw new ImportError("unknown company")`. */
export class ImportError extends Error {}

type Pending<Input> = { fileName: string; inputs: Input[]; skipped: string[] };

/**
 * Import and Export buttons for a table. Export writes the rows currently shown to an
 * .xlsx file. Import reads an .xlsx file with the same column headers, shows how many
 * rows are usable, and adds them as new rows once confirmed.
 */
export function TableTransfer<Row, Input = never>({
  name,
  label,
  columns,
  rows,
  parse,
  add,
}: {
  /** File and sheet name, e.g. "jobs". */
  name: string;
  /** What the rows are called in messages, e.g. "jobs". */
  label: string;
  columns: ExcelColumn<Row>[];
  rows: Row[];
  /** Turns one spreadsheet row into a new row; throws ImportError to skip it. Omit for export only. */
  parse?: ((record: ExcelRecord) => Input) | undefined;
  add?: ((input: Input) => unknown) | undefined;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending<Input> | null>(null);
  const [open, setOpen] = useState(false);

  const runExport = async () => {
    setBusy(true);
    try {
      await exportExcel(`${name}-${new Date().toISOString().slice(0, 10)}`, name, columns, rows);
    } catch (error) {
      console.error(error);
      toast.error("Could not create the Excel file.");
    }
    setBusy(false);
  };

  const readFile = async (file: File) => {
    if (!parse) return;
    setBusy(true);
    try {
      const records = await readExcel(file);
      const inputs: Input[] = [];
      const skipped: string[] = [];
      for (const record of records) {
        try {
          inputs.push(parse(record));
        } catch (error) {
          if (!(error instanceof ImportError)) throw error;
          skipped.push(`Row ${record.rowNumber}: ${error.message}`);
        }
      }
      if (inputs.length === 0 && skipped.length === 0) {
        toast.error("No rows found. The first row of the sheet must be the column headers.");
      } else {
        setPending({ fileName: file.name, inputs, skipped });
        setOpen(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not read that file. Import needs an .xlsx Excel file.");
    }
    setBusy(false);
  };

  const runImport = async () => {
    if (!pending || !add) return;
    setBusy(true);
    for (const [index, input] of pending.inputs.entries()) {
      // Rows are saved one at a time (and paced) so a large sheet doesn't flood the server.
      await add(input);
      if (index % 20 === 19) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setBusy(false);
    toast.success(`Imported ${pending.inputs.length} ${label}.`);
  };

  return (
    <>
      {parse && add && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared so picking the same file again still triggers a read.
              event.target.value = "";
              if (file) void readFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            title={`Import ${label} from an Excel file with these columns: ${columns.map((column) => column.header).join(", ")}`}
            className={buttonClass}
          >
            <Upload size={13} /> Import
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => void runExport()}
        disabled={busy || rows.length === 0}
        title={`Export the ${label} shown to an Excel file`}
        className={buttonClass}
      >
        <Download size={13} /> Export
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="glass-surface max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-base">
              Import {pending?.inputs.length ?? 0} {label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              From {pending?.fileName}. They are added as new rows; existing rows are not changed.
              {pending && pending.skipped.length > 0
                ? ` ${pending.skipped.length} row${pending.skipped.length === 1 ? "" : "s"} will be skipped.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending && pending.skipped.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded-xl bg-chip px-3 py-2 font-mono text-[11px] text-muted-fg">
              {pending.skipped.slice(0, 50).map((line) => (
                <li key={line}>{line}</li>
              ))}
              {pending.skipped.length > 50 && <li>…and {pending.skipped.length - 50} more</li>}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pending || pending.inputs.length === 0}
              onClick={() => void runImport()}
              className="rounded-xl"
            >
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
