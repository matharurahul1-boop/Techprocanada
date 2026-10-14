// Reading and writing .xlsx files for the table Import / Export buttons.
// The Excel library is large, so it is only loaded when one of them is used.

export type ExcelValue = string | number | boolean | null;

export type ExcelColumn<Row> = {
  header: string;
  value: (row: Row) => ExcelValue;
  /** Column width in characters (default 18). */
  width?: number;
};

/** One spreadsheet row: look a cell up by its column header. */
export type ExcelRecord = {
  /** Cell text under `header` ("" when the column or cell is missing). */
  get: (header: string) => string;
  /** Row number in the sheet (the header row is 1). */
  rowNumber: number;
};

async function loadExcel() {
  const module = await import("exceljs");
  return module.default ?? module;
}

// Headers match loosely: "Job Number", "job_number" and "JOB NUMBER " are the same column.
const headerKey = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Whatever the library hands back for a cell (text, number, date, formula, link) → text. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    const cell = value as {
      result?: unknown;
      text?: unknown;
      richText?: { text?: string }[];
      error?: unknown;
    };
    if (cell.richText)
      return cell.richText
        .map((part) => part.text ?? "")
        .join("")
        .trim();
    if (cell.result !== undefined) return cellText(cell.result);
    if (cell.text !== undefined) return cellText(cell.text);
    return "";
  }
  return String(value).trim();
}

/** Reads the first sheet of an .xlsx file; row 1 is the header row. Blank rows are skipped. */
export async function readExcel(file: File): Promise<ExcelRecord[]> {
  const ExcelJS = await loadExcel();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const columnByHeader = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    const key = headerKey(cellText(cell.value));
    if (key && !columnByHeader.has(key)) columnByHeader.set(key, column);
  });

  const records: ExcelRecord[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const get = (header: string) => {
      const column = columnByHeader.get(headerKey(header));
      return column === undefined ? "" : cellText(row.getCell(column).value);
    };
    const blank = [...columnByHeader.values()].every(
      (column) => cellText(row.getCell(column).value) === "",
    );
    if (!blank) records.push({ get, rowNumber });
  });
  return records;
}

/** Builds an .xlsx file from `rows` and hands it to the browser as a download. */
export async function exportExcel<Row>(
  fileName: string,
  sheetName: string,
  columns: ExcelColumn<Row>[],
  rows: Row[],
) {
  const ExcelJS = await loadExcel();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width ?? 18,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const dayFirst = (value: ExcelValue) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
      : value;
  for (const row of rows) sheet.addRow(columns.map((column) => dayFirst(column.value(row))));

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Helpers for turning imported cell text into field values ────────────────

/** "12", "12.5", "1,200" → number; blank → 0; anything else → null. */
export const cellNumber = (text: string): number | null => {
  if (!text) return 0;
  const number = Number(text.replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
};

/** "2026-10-13", "13/10/2026" or "13-10-2026" → "2026-10-13"; blank → ""; else null. */
export const cellDate = (text: string): string | null => {
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : dmy ? [dmy[3], dmy[2], dmy[1]] : null;
  if (!parts) return null;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/** "yes", "y", "true", "1", "x" → true; everything else → false. */
export const cellBool = (text: string) => /^(yes|y|true|1|x)$/i.test(text);

/** Picks the option matching the cell regardless of letter case; null when none does. */
export const cellOption = <T extends string>(text: string, options: readonly T[]): T | null =>
  options.find((option) => option.toLowerCase() === text.toLowerCase()) ?? null;
