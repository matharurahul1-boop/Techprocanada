// Server-only. Hit directly over plain HTTP by Vercel Cron (not through the
// TanStack Start server-fn RPC path) - see src/server.ts for the routing and
// vercel.json for the schedule. Requires CRON_SECRET to be set in the
// deployment environment; Vercel sends it automatically as a Bearer token
// for requests it triggers itself.
import { isDueOn, toIsoDate, type Frequency, type Weekday } from "./schedule";

export async function handleGenerateReportsCron(request: Request): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  const secret = process.env["CRON_SECRET"];
  if (!secret) return json({ error: "CRON_SECRET is not configured" }, 500);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { generateReportForConfig } = await import("./generate-report.server");

  const { data: configs, error } = await supabaseAdmin.from("timeliness_configurations").select("*");
  if (error) return json({ error: error.message }, 500);

  const today = new Date();
  const todayIso = toIsoDate(today);
  const results: Array<{ id: number; reportName: string; generated: boolean; reason?: string }> = [];

  for (const config of configs ?? []) {
    if (!isDueOn(config.frequency as Frequency, config.submission_day as Weekday, today)) {
      results.push({ id: config.id, reportName: config.report_name, generated: false, reason: "not due today" });
      continue;
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("generated_reports")
      .select("id")
      .eq("configuration_id", config.id)
      .gte("created_at", `${todayIso}T00:00:00.000Z`)
      .limit(1);
    if (existingError) {
      results.push({ id: config.id, reportName: config.report_name, generated: false, reason: existingError.message });
      continue;
    }
    if (existing && existing.length > 0) {
      results.push({ id: config.id, reportName: config.report_name, generated: false, reason: "already generated today" });
      continue;
    }

    try {
      await generateReportForConfig(supabaseAdmin, config);
      results.push({ id: config.id, reportName: config.report_name, generated: true });
    } catch (e) {
      results.push({
        id: config.id,
        reportName: config.report_name,
        generated: false,
        reason: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  return json({ ranAt: todayIso, results });
}
