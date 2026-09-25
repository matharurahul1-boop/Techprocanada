// Server-only orchestration: build the report PDF, upload it to the
// "reports" Supabase Storage bucket, and record it in generated_reports.
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/integrations/supabase/types";
import { buildReport } from "./report-data.server";
import { buildTablePdf } from "./pdf-table";
import { periodFor, type Frequency } from "./schedule";

type Db = SupabaseClient<Database>;
type Configuration = Tables<"timeliness_configurations">;

export async function generateReportForConfig(
  db: Db,
  config: Configuration,
): Promise<Tables<"generated_reports">> {
  const period = periodFor(config.frequency as Frequency, new Date());
  const result = await buildReport(db, config.report_table, period);
  const pdfBytes = await buildTablePdf({
    title: config.report_name,
    subtitle: `${config.report_table} · ${period.start} to ${period.end}`,
    columns: result.columns,
    rows: result.rows,
  });

  const fileName = `${config.report_table.replace(/\s+/g, "_")}_${period.end}_${Date.now()}.pdf`;
  const storagePath = `${config.id}/${fileName}`;

  const { error: uploadError } = await db.storage
    .from("reports")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: inserted, error: insertError } = await db
    .from("generated_reports")
    .insert({
      configuration_id: config.id,
      report_table: config.report_table,
      period_start: period.start,
      period_end: period.end,
      storage_path: storagePath,
      file_name: fileName,
      row_count: result.rows.length,
    })
    .select("*")
    .single();
  if (insertError) throw new Error(`Saving report record failed: ${insertError.message}`);

  return inserted;
}
