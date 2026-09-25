// This file ships to the client bundle (imported from a hook), but every
// handler below only ever *dynamically* imports server-only code at call
// time, so the service-role key and VAPID private key never reach the client.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ endpoint: z.string(), p256dh: z.string(), auth: z.string() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        { user_id: context.userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ endpoint: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
  });

export const notifyLowStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        itemName: z.string(),
        level: z.enum(["warning", "critical"]),
        balance: z.number(),
        threshold: z.number(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { sendPushToAllUsers } = await import("./send-push.server");
    await sendPushToAllUsers({
      title: data.level === "critical" ? "Stock below threshold" : "Stock at threshold",
      body: `${data.itemName}: ${data.balance} remaining (threshold ${data.threshold}).`,
      url: "/inventory-items",
    });
  });
