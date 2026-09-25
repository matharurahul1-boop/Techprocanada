// Server-only: sends real Web Push notifications to every subscribed device,
// replacing the old frontend-only toast for low-stock alerts.
import webpush from "web-push";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type PushPayload = { title: string; body: string; url?: string };

function configureWebPush() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY. Run supabase/push_notifications_setup.sql and set these env vars.",
    );
  }
  webpush.setVapidDetails("mailto:alerts@techprocanada.com", publicKey, privateKey);
}

export async function sendPushToAllUsers(
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  configureWebPush();

  const { data: subs, error } = await supabaseAdmin.from("push_subscriptions").select("*");
  if (error) throw new Error(error.message);

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          removed += 1;
        } else {
          console.error("[push] send failed:", err);
        }
      }
    }),
  );

  return { sent, removed };
}
