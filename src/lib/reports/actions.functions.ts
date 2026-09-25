// This file ships to the client bundle (it's imported from route components),
// but every handler below only ever *dynamically* imports the service-role
// client at call time, so the secret key itself never reaches the client.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateReportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ configurationId: z.number() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: config, error } = await supabaseAdmin
      .from("timeliness_configurations")
      .select("*")
      .eq("id", data.configurationId)
      .single();
    if (error || !config) throw new Error("Configuration not found");

    const { generateReportForConfig } = await import("./generate-report.server");
    return generateReportForConfig(supabaseAdmin, config);
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ configurationId: z.number().optional() }).parse(data ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("generated_reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (data.configurationId !== undefined) query = query.eq("configuration_id", data.configurationId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getReportDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ storagePath: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("reports")
      .createSignedUrl(data.storagePath, 60 * 10);
    if (error || !signed) throw new Error(error?.message ?? "Could not create a download link");
    return signed.signedUrl;
  });
