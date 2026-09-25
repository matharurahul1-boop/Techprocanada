import { useCallback, useEffect, useState } from "react";

import { removePushSubscription, savePushSubscription } from "@/lib/push/actions.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
  }, []);

  useEffect(() => {
    if (!supported) return;
    void navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(!!subscription);
    });
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const vapidKey = import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined;
      if (!vapidKey) throw new Error("Push isn't configured yet (missing VITE_VAPID_PUBLIC_KEY).");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.["p256dh"] || !json.keys?.["auth"]) {
        throw new Error("Browser did not return a usable push subscription.");
      }
      await savePushSubscription({
        data: { endpoint: json.endpoint, p256dh: json.keys["p256dh"], auth: json.keys["auth"] },
      });
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription({ data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, enabled, busy, enable, disable };
}
