import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ReportColumn = { header: string; width: number };
export type ReportResult = { columns: ReportColumn[]; rows: string[][] };

const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 24;
const FONT_SIZE = 9;

function truncateToWidth(text: string, width: number, font: PDFFont, size: number): string {
  if (font.widthOfTextAtSize(text, size) <= width - 8) return text;
  let result = text;
  while (result.length > 1 && font.widthOfTextAtSize(result + "…", size) > width - 8) {
    result = result.slice(0, -1);
  }
  return result + "…";
}

export async function buildTablePdf(opts: {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: string[][];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const usableWidth = PAGE_WIDTH - MARGIN * 2;

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawTableHeader = () => {
    let x = MARGIN;
    page.drawRectangle({
      x: MARGIN,
      y: y - HEADER_HEIGHT,
      width: usableWidth,
      height: HEADER_HEIGHT,
      color: rgb(0.93, 0.93, 0.93),
    });
    for (const col of opts.columns) {
      page.drawText(truncateToWidth(col.header, col.width, boldFont, FONT_SIZE), {
        x: x + 4,
        y: y - HEADER_HEIGHT + 7,
        size: FONT_SIZE,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      x += col.width;
    }
    y -= HEADER_HEIGHT;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + usableWidth, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    drawTableHeader();
  };

  page.drawText(opts.title, { x: MARGIN, y, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  y -= 22;
  page.drawText(opts.subtitle, { x: MARGIN, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  y -= 20;
  drawTableHeader();

  if (opts.rows.length === 0) {
    page.drawText("No records found for this period.", {
      x: MARGIN,
      y: y - 16,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  for (const row of opts.rows) {
    if (y - ROW_HEIGHT < MARGIN) newPage();
    let x = MARGIN;
    for (let i = 0; i < opts.columns.length; i++) {
      const col = opts.columns[i]!;
      page.drawText(truncateToWidth(row[i] ?? "", col.width, font, FONT_SIZE), {
        x: x + 4,
        y: y - ROW_HEIGHT + 6,
        size: FONT_SIZE,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      x += col.width;
    }
    y -= ROW_HEIGHT;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + usableWidth, y },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.85),
    });
  }

  return doc.save();
}
